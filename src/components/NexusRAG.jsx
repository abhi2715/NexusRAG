import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Plus, Settings, Sun, Moon, Upload, ClipboardPaste, PanelLeft, Download, Trash2, FileText, UploadCloud, Keyboard } from 'lucide-react';
import Cursor from './Cursor';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SettingsModal from './SettingsModal';
import DocPreview from './DocPreview';
import CommandPalette from './CommandPalette';
import Modal, { ConfirmDialog } from './Modal';
import { useToast } from './Toasts';
import { useSessions } from '../hooks/useSessions';
import { useDocs } from '../hooks/useDocs';
import { useSettings } from '../hooks/useSettings';
import { useIsMobile, useIsTouch } from '../hooks/useMediaQuery';
import { useSpeak } from '../hooks/useSpeech';
import { retrieve, buildContext } from '../utils/nlp';
import { streamChat, completeJSON, listModels, stripThinking, checkServerKey } from '../utils/groq';
import { effectiveApiKey, FALLBACK_MODELS } from '../utils/settings';
import { exportSession, download } from '../utils/exporters';
import { uid, ACCEPT } from '../utils/format';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function buildSystemPrompt({ docs, context, mode, custom }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (!docs.length) {
    return `You are NexusRAG, a helpful, precise AI assistant. Today is ${today}. Format answers in clean Markdown (headings, lists, tables, code blocks where useful). ` +
      `If the user asks about their documents, tell them to upload files using the paperclip or sidebar.` +
      (custom ? `\n\nUser instructions:\n${custom}` : '');
  }
  const docList = docs.map(d => `- ${d.name}${d.pages ? ` (${d.pages} pages)` : d.rows ? ` (${d.rows} rows)` : ''}`).join('\n');
  return `You are NexusRAG, an expert document analyst. Today is ${today}.

The user has these documents loaded:
${docList}

Below are the passages retrieved for this question${mode === 'overview' ? ' (sampled across each document for an overview)' : ''}, each labelled with a number.

<context>
${context || '(no relevant passages found)'}
</context>

Rules:
1. Ground your answer in the passages. Cite each factual claim with its passage number in square brackets right after the claim, e.g. "Revenue grew 12% [2]." Use multiple citations like [1][3] when needed. Only cite numbers that exist above.
2. If the passages don't contain the answer, say so plainly. You may then add general knowledge, clearly labelled as not from the documents.
3. Be specific: exact figures, names, dates and short quotes. Never invent facts.
4. For spreadsheet data, the precomputed column statistics are exact; use them for totals, averages and counts.
5. Use Markdown: short paragraphs, bullet lists, tables for comparisons, **bold** for key terms. Don't add a separate sources list at the end; the app shows sources automatically.` +
    (custom ? `\n\nUser instructions (follow these too):\n${custom}` : '');
}

export default function NexusRAG() {
  const toast = useToast();
  const { settings, update, resolvedTheme } = useSettings();
  const apiKey = effectiveApiKey(settings);
  // A server-side key (Vercel env GROQ_API_KEY) is used when the user hasn't entered their own.
  const [serverKey, setServerKey] = useState(false);
  useEffect(() => { checkServerKey().then(setServerKey); }, []);
  const canChat = !!apiKey || serverKey;
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  const speak = useSpeak();

  const {
    sessions, activeId, setActiveId, activeSession, createSession, updateSession, deleteSession, importSessions, clearSessions,
  } = useSessions();

  const [summarizing, setSummarizing] = useState(() => new Set());
  const summarizeDocRef = useRef(null);
  const { docs, addFiles, addText, removeDoc, toggleDoc, setAllEnabled, patchDoc, clearDocs } = useDocs({
    onReady: doc => {
      toast(`Indexed ${doc.name} (${doc.chunks.length} passages)`, 'success');
      summarizeDocRef.current?.(doc, true);
    },
    onError: (name, err) => toast(`${name}: ${err.message}`, 'error', 6000),
  });

  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null); // { sid, msg }
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const [models, setModels] = useState(() => FALLBACK_MODELS.map(id => ({ id })));
  const [desktopSidebar, setDesktopSidebar] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [rename, setRename] = useState(null);
  const [addTextOpen, setAddTextOpen] = useState(false);
  const [preview, setPreview] = useState(null); // { docId, focus }
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const readyDocs = useMemo(() => docs.filter(d => d.status === 'ready'), [docs]);
  const activeDocs = useMemo(() => readyDocs.filter(d => d.enabled !== false), [readyDocs]);
  const busy = !!pending;

  // ── Load the live model list once a key is available ────────────────────
  useEffect(() => {
    if (!canChat) return;
    let cancelled = false;
    listModels(apiKey).then(list => { if (!cancelled && list.length) setModels(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, [apiKey, canChat]);

  const focusInput = useCallback(() => setTimeout(() => inputRef.current?.focus(), 30), []);

  // ── Document summaries ───────────────────────────────────────────────────
  const summarizeDoc = useCallback(async (doc, auto = false) => {
    if (!canChat || (auto && !settings.autoSummarize)) return;
    setSummarizing(s => new Set(s).add(doc.id));
    try {
      const n = doc.chunks.length;
      const idx = [...new Set([0, 1, 2, Math.floor(n / 3), Math.floor(n / 2), Math.floor((2 * n) / 3), n - 1])].filter(i => i >= 0 && i < n);
      const sample = idx.map(i => doc.chunks[i].text).join('\n…\n').slice(0, 7000);
      const out = await completeJSON({
        apiKey, model: settings.model,
        system: 'You analyse documents. Reply with JSON only: {"summary": "2-3 sentence plain-language summary of what the document is and its main points", "questions": ["3 specific, interesting questions a reader could ask that this document answers"]}',
        user: `Document name: ${doc.name}\n\nExcerpts:\n${sample}`,
      });
      if (out.summary) {
        patchDoc(doc.id, { summary: String(out.summary), questions: (out.questions || []).slice(0, 3).map(String) });
      }
    } catch (e) {
      if (!auto) toast(`Couldn't summarize: ${e.message}`, 'error');
    } finally {
      setSummarizing(s => { const n = new Set(s); n.delete(doc.id); return n; });
    }
  }, [apiKey, canChat, settings.autoSummarize, settings.model, patchDoc, toast]);
  summarizeDocRef.current = summarizeDoc;

  // ── Title + follow-up suggestions after an answer ───────────────────────
  const postProcess = useCallback(async (sid, msgId, question, answer, needTitle) => {
    if (!canChat || (!needTitle && !settings.followUps)) return;
    try {
      const out = await completeJSON({
        apiKey, model: settings.model, maxTokens: 300,
        system: 'Reply with JSON only: {"title": "concise 3-6 word chat title, no quotes or punctuation at the end", "followUps": ["three short, distinct follow-up questions the user is likely to ask next, each under 12 words"]}',
        user: `User question: ${question}\n\nAssistant answer:\n${answer.slice(0, 3000)}`,
      });
      updateSession(sid, s => ({
        ...s,
        title: needTitle && s.autoTitle && out.title ? String(out.title).replace(/^["']|["'.]$/g, '').slice(0, 60) : s.title,
        autoTitle: needTitle ? false : s.autoTitle,
        messages: settings.followUps && Array.isArray(out.followUps)
          ? s.messages.map(m => (m.id === msgId ? { ...m, followUps: out.followUps.slice(0, 3).map(String) } : m))
          : s.messages,
      }), { touch: false });
    } catch { /* non-critical */ }
  }, [apiKey, canChat, settings.model, settings.followUps, updateSession]);

  // ── Core generation ──────────────────────────────────────────────────────
  const generate = useCallback(async (sid, history, { needTitle = false } = {}) => {
    const userMsg = history[history.length - 1];
    const prevUser = [...history].slice(0, -1).reverse().find(m => m.role === 'user');
    const placeholder = { id: uid('m_'), role: 'assistant', content: '', ts: new Date().toISOString(), pending: true, stage: activeDocs.length ? 'Searching documents…' : 'Thinking…' };
    setPending({ sid, msg: placeholder });

    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = performance.now();
    let text = '';
    let sources = [];

    try {
      let context = '';
      let mode = 'none';
      if (activeDocs.length) {
        const r = retrieve(userMsg.content, activeDocs, { topK: settings.topK, prevQuery: prevUser?.content || '' });
        mode = r.mode;
        ({ context, sources } = buildContext(r.results, settings.contextChars));
      }
      setPending({ sid, msg: { ...placeholder, stage: activeDocs.length ? `Reading ${sources.length} passage${sources.length !== 1 ? 's' : ''}…` : 'Thinking…' } });

      const system = buildSystemPrompt({ docs: activeDocs, context, mode, custom: settings.systemPrompt.trim() });
      const prior = history.slice(0, -1).filter(m => !m.error && m.content).slice(-settings.historyTurns)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

      // Throttle re-renders to animation frames while streaming.
      let raf = null;
      const flush = () => {
        raf = null;
        const visible = stripThinking(text);
        setPending({ sid, msg: { ...placeholder, content: visible, stage: !visible && text.includes('<think>') ? 'Reasoning…' : placeholder.stage } });
      };

      const result = await streamChat({
        apiKey, model: settings.model, temperature: settings.temperature, maxTokens: settings.maxTokens,
        messages: [{ role: 'system', content: system }, ...prior, { role: 'user', content: userMsg.content }],
        signal: controller.signal,
        onToken: (_, full) => { text = full; if (!raf) raf = requestAnimationFrame(flush); },
      });
      if (raf) cancelAnimationFrame(raf);

      const ms = performance.now() - t0;
      const u = result.usage;
      const cited = new Set([...result.text.matchAll(/\[(\d{1,2})\]/g)].map(m => Number(m[1])));
      const shownSources = cited.size ? sources.filter(s => cited.has(s.n)) : sources;
      const finalMsg = {
        id: placeholder.id, role: 'assistant', content: result.text || '_(empty response)_', ts: placeholder.ts,
        sources: shownSources,
        stats: {
          model: settings.model, ms: Math.round(ms),
          tokens: u?.completion_tokens,
          tps: u?.completion_tokens && u?.completion_time ? u.completion_tokens / u.completion_time : undefined,
        },
      };
      updateSession(sid, s => ({ ...s, messages: [...history, finalMsg] }));
      setPending(null);
      postProcess(sid, finalMsg.id, userMsg.content, result.text, needTitle);
    } catch (err) {
      const aborted = err.name === 'AbortError';
      const partial = stripThinking(text);
      const msg = aborted
        ? (partial ? { id: placeholder.id, role: 'assistant', content: partial, ts: placeholder.ts, sources, stopped: true } : null)
        : { id: placeholder.id, role: 'assistant', content: err.message || String(err), ts: placeholder.ts, error: true };
      updateSession(sid, s => ({ ...s, messages: msg ? [...history, msg] : history }));
      setPending(null);
      if (!aborted && err.status === 401) setSettingsOpen(true);
    } finally {
      abortRef.current = null;
    }
  }, [activeDocs, apiKey, settings, updateSession, postProcess]);

  const send = useCallback((override) => {
    const text = (typeof override === 'string' ? override : input).trim();
    if (!text || busy) return;
    if (!canChat) {
      toast('Add your Groq API key in Settings first.', 'error');
      setSettingsOpen(true);
      return;
    }
    if (typeof override !== 'string') setInput('');
    const userMsg = { id: uid('m_'), role: 'user', content: text, ts: new Date().toISOString() };
    let sid = activeId;
    let needTitle = false;
    let history;
    if (!sid || !activeSession) {
      sid = createSession(text.replace(/\s+/g, ' ').slice(0, 50));
      updateSession(sid, s => ({ ...s, autoTitle: true }), { touch: false });
      needTitle = true;
      history = [userMsg];
    } else {
      needTitle = activeSession.messages.length === 0 || activeSession.autoTitle;
      if (activeSession.messages.length === 0) updateSession(sid, s => ({ ...s, title: text.slice(0, 50), autoTitle: true }), { touch: false });
      history = [...activeSession.messages, userMsg];
    }
    updateSession(sid, s => ({ ...s, messages: history }));
    if (isMobile) setMobileSidebar(false);
    generate(sid, history, { needTitle });
  }, [input, busy, canChat, activeId, activeSession, createSession, updateSession, generate, isMobile, toast]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (!activeSession || busy) return;
    const msgs = activeSession.messages;
    let end = msgs.length;
    while (end > 0 && msgs[end - 1].role !== 'user') end--;
    if (!end) return;
    const history = msgs.slice(0, end);
    updateSession(activeSession.id, s => ({ ...s, messages: history }));
    generate(activeSession.id, history);
  }, [activeSession, busy, updateSession, generate]);

  const editMessage = useCallback((msgId, text) => {
    if (!activeSession || busy) return;
    const idx = activeSession.messages.findIndex(m => m.id === msgId);
    if (idx < 0) return;
    const history = [...activeSession.messages.slice(0, idx), { ...activeSession.messages[idx], content: text, edited: true, ts: new Date().toISOString() }];
    updateSession(activeSession.id, s => ({ ...s, messages: history }));
    generate(activeSession.id, history);
  }, [activeSession, busy, updateSession, generate]);

  // ── Chat management ──────────────────────────────────────────────────────
  const newChat = useCallback(() => {
    if (busy) stop();
    setActiveId(null);
    setInput('');
    if (isMobile) setMobileSidebar(false);
    focusInput();
  }, [busy, stop, setActiveId, isMobile, focusInput]);

  const selectChat = useCallback(id => {
    if (busy && pending?.sid !== id) stop();
    setActiveId(id);
    if (isMobile) setMobileSidebar(false);
  }, [busy, pending, stop, setActiveId, isMobile]);

  const askDelete = useCallback(id => {
    const s = sessions.find(x => x.id === id);
    setConfirm({
      title: 'Delete chat?',
      message: <>“<b style={{ color: 'var(--text)' }}>{s?.title}</b>” will be permanently deleted.</>,
      onConfirm: () => { if (pending?.sid === id) stop(); deleteSession(id); toast('Chat deleted', 'success'); },
    });
  }, [sessions, pending, stop, deleteSession, toast]);

  const togglePin = useCallback(id => updateSession(id, s => ({ ...s, pinned: !s.pinned })), [updateSession]);

  const openRename = useCallback(id => {
    const s = sessions.find(x => x.id === id);
    if (s) setRename({ id, title: s.title });
  }, [sessions]);

  const askRemoveDoc = useCallback(doc => {
    if (doc.status !== 'ready') return removeDoc(doc.id);
    setConfirm({
      title: 'Remove document?',
      message: <>“<b style={{ color: 'var(--text)' }}>{doc.name}</b>” will be removed from your library. Existing answers keep their saved citations.</>,
      confirmLabel: 'Remove',
      onConfirm: () => { removeDoc(doc.id); if (preview?.docId === doc.id) setPreview(null); },
    });
  }, [removeDoc, preview]);

  const openSource = useCallback(src => {
    setPreview({ docId: src.docId, focus: { ci: src.ci, text: src.text, docName: src.docName } });
  }, []);

  const exportAll = useCallback(() => {
    download(`nexusrag-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'nexusrag', version: 2, exportedAt: new Date().toISOString(), sessions }, null, 2), 'application/json');
  }, [sessions]);

  const importAll = useCallback(async file => {
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : data.sessions ? data.sessions : data.messages ? [data] : [];
      const valid = list.filter(s => s && Array.isArray(s.messages));
      if (!valid.length) throw new Error('No chats found in that file.');
      const n = importSessions(valid.map(s => ({ ...s, title: s.title || 'Imported chat' })));
      toast(`Imported ${n} chat${n > 1 ? 's' : ''}`, 'success');
    } catch (e) {
      toast(`Import failed: ${e.message}`, 'error');
    }
  }, [importSessions, toast]);

  const toggleTheme = useCallback(() => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }), [update, resolvedTheme]);
  const toggleSidebar = useCallback(() => (isMobile ? setMobileSidebar(o => !o) : setDesktopSidebar(o => !o)), [isMobile]);

  // ── Global keyboard shortcuts ────────────────────────────────────────────
  const anyModal = settingsOpen || paletteOpen || !!confirm || !!rename || addTextOpen || !!preview || shortcutsOpen;
  useEffect(() => {
    const onKey = e => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'k') { e.preventDefault(); setPaletteOpen(o => !o); }
      else if (mod && e.shiftKey && k === 'o') { e.preventDefault(); newChat(); }
      else if (mod && k === 'b') { e.preventDefault(); toggleSidebar(); }
      else if (mod && k === ',') { e.preventDefault(); setSettingsOpen(true); }
      else if (mod && k === 'u') { e.preventDefault(); fileInputRef.current?.click(); }
      else if (e.key === 'Escape' && busy && !anyModal) stop();
      else if (e.key === '/' && !anyModal && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { e.preventDefault(); inputRef.current?.focus(); }
      else if (e.key === '?' && e.shiftKey && !anyModal && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newChat, toggleSidebar, stop, busy, anyModal]);

  // ── Drop files anywhere ──────────────────────────────────────────────────
  useEffect(() => {
    let depth = 0;
    const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files');
    const enter = e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setDragging(true); };
    const over = e => { if (hasFiles(e)) e.preventDefault(); };
    const leave = e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const drop = e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [addFiles]);

  // ── Derived view data ────────────────────────────────────────────────────
  const messages = useMemo(() => {
    const base = activeSession?.messages || [];
    return pending && pending.sid === activeId ? [...base, pending.msg] : base;
  }, [activeSession, pending, activeId]);

  const mod = isMac ? '⌘' : 'Ctrl+';
  const paletteActions = useMemo(() => [
    { id: 'new', label: 'New chat', icon: Plus, hint: `${mod}⇧O`, group: 'Actions', run: newChat },
    { id: 'upload', label: 'Upload documents', icon: Upload, hint: `${mod}U`, group: 'Actions', run: () => fileInputRef.current?.click() },
    { id: 'paste', label: 'Paste text as document', icon: ClipboardPaste, group: 'Actions', run: () => setAddTextOpen(true) },
    { id: 'theme', label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`, icon: resolvedTheme === 'dark' ? Sun : Moon, group: 'Actions', run: toggleTheme },
    { id: 'sidebar', label: 'Toggle sidebar', icon: PanelLeft, hint: `${mod}B`, group: 'Actions', run: toggleSidebar },
    { id: 'settings', label: 'Open settings', icon: Settings, hint: `${mod},`, group: 'Actions', run: () => setSettingsOpen(true) },
    ...(activeSession ? [
      { id: 'export-md', label: 'Export current chat as Markdown', icon: FileText, group: 'Actions', run: () => exportSession(activeSession, 'md') },
      { id: 'delete', label: 'Delete current chat', icon: Trash2, group: 'Actions', run: () => askDelete(activeSession.id) },
    ] : []),
    { id: 'backup', label: 'Export backup of all chats', icon: Download, group: 'Actions', run: exportAll },
    { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard, hint: '?', group: 'Actions', run: () => setShortcutsOpen(true) },
    ...readyDocs.map(d => ({ id: 'doc-' + d.id, label: d.name, icon: FileText, group: 'Documents', run: () => setPreview({ docId: d.id, focus: null }) })),
  ], [mod, newChat, resolvedTheme, toggleTheme, toggleSidebar, activeSession, askDelete, exportAll, readyDocs]);

  const previewDoc = preview ? docs.find(d => d.id === preview.docId) : null;
  const sidebarOpen = isMobile ? mobileSidebar : desktopSidebar;

  return (
    <div className="app">
      {settings.customCursor && !isTouch && <Cursor />}
      <input ref={fileInputRef} type="file" multiple accept={ACCEPT} hidden onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

      {isMobile && mobileSidebar && <div className="mobile-overlay" onClick={() => setMobileSidebar(false)} />}

      <Sidebar
        open={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setMobileSidebar(false)}
        docs={docs}
        onFiles={addFiles}
        onAddText={() => setAddTextOpen(true)}
        onToggleDoc={toggleDoc}
        onSetAllDocs={setAllEnabled}
        onPreviewDoc={d => setPreview({ docId: d.id, focus: null })}
        onRemoveDoc={askRemoveDoc}
        sessions={sessions}
        activeId={activeId}
        onSelect={selectChat}
        onNew={newChat}
        onRename={openRename}
        onTogglePin={togglePin}
        onDelete={askDelete}
        onOpenSettings={() => setSettingsOpen(true)}
        hasKey={canChat}
        model={settings.model}
        dragging={dragging}
      />

      <ChatArea
        session={activeSession}
        messages={messages}
        busy={busy}
        input={input}
        setInput={setInput}
        onSend={send}
        onStop={stop}
        inputRef={inputRef}
        activeDocs={activeDocs}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
        theme={resolvedTheme}
        onToggleTheme={toggleTheme}
        onExport={fmt => activeSession && exportSession(activeSession, fmt)}
        onDelete={() => activeSession && askDelete(activeSession.id)}
        onRename={() => activeSession && openRename(activeSession.id)}
        onTogglePin={() => activeSession && togglePin(activeSession.id)}
        onOpenSource={openSource}
        onRegenerate={regenerate}
        onEditMessage={editMessage}
        speak={speak}
        followUpsEnabled={settings.followUps}
        hasKey={canChat}
        settings={settings}
        models={models}
        onModelChange={model => update({ model })}
        onFiles={addFiles}
        toast={toast}
        onUpload={() => fileInputRef.current?.click()}
      />

      {preview && (
        <DocPreview
          doc={previewDoc}
          focus={preview.focus}
          onClose={() => setPreview(null)}
          onAsk={q => { setPreview(null); send(q); }}
          onSummarize={d => summarizeDoc(d)}
          summarizing={previewDoc ? summarizing.has(previewDoc.id) : false}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          update={update}
          models={models}
          setModels={setModels}
          serverKey={serverKey}
          onClose={() => setSettingsOpen(false)}
          onExportAll={exportAll}
          onImportAll={importAll}
          onClearChats={() => setConfirm({ title: 'Delete all chats?', message: `All ${sessions.length} conversations will be permanently deleted.`, confirmLabel: 'Delete all', onConfirm: () => { stop(); clearSessions(); toast('All chats deleted', 'success'); } })}
          onClearDocs={() => setConfirm({ title: 'Remove all documents?', message: `All ${docs.length} documents will be removed from your library.`, confirmLabel: 'Remove all', onConfirm: () => { clearDocs(); setPreview(null); toast('Document library cleared', 'success'); } })}
          toast={toast}
        />
      )}

      {paletteOpen && (
        <CommandPalette actions={paletteActions} sessions={sessions} onSelectSession={selectChat} onClose={() => setPaletteOpen(false)} />
      )}

      {rename && (
        <Modal
          title="Rename chat"
          onClose={() => setRename(null)}
          footer={<>
            <button className="btn" onClick={() => setRename(null)}>Cancel</button>
            <button className="btn btn-primary" form="rename-form" type="submit">Save</button>
          </>}
        >
          <form id="rename-form" onSubmit={e => {
            e.preventDefault();
            const t = rename.title.trim();
            if (t) updateSession(rename.id, s => ({ ...s, title: t.slice(0, 80), autoTitle: false }), { touch: false });
            setRename(null);
          }}>
            <input className="input" autoFocus value={rename.title} onChange={e => setRename(r => ({ ...r, title: e.target.value }))} onFocus={e => e.target.select()} />
          </form>
        </Modal>
      )}

      {addTextOpen && <AddTextModal onClose={() => setAddTextOpen(false)} onAdd={(name, text) => { addText(name, text); setAddTextOpen(false); }} />}

      {shortcutsOpen && (
        <Modal title="Keyboard shortcuts" icon={<Keyboard size={18} color="var(--accent)" />} onClose={() => setShortcutsOpen(false)}>
          {[
            [`${mod}K`, 'Command palette / search chats'],
            [`${mod}⇧O`, 'New chat'],
            [`${mod}U`, 'Upload documents'],
            [`${mod}B`, 'Toggle sidebar'],
            [`${mod},`, 'Settings'],
            ['/', 'Focus message box'],
            ['Esc', 'Stop generating / close dialogs'],
            ['Shift+Enter', 'New line in message'],
            ['?', 'Show this list'],
          ].map(([k, d]) => (
            <div key={k} className="row"><span className="r-t" style={{ fontWeight: 500 }}>{d}</span><span className="kbd">{k}</span></div>
          ))}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}

      {dragging && (
        <div className="drop-overlay">
          <div className="drop-card">
            <UploadCloud size={44} />
            <div className="t">Drop to add to your library</div>
            <div className="s">PDF · DOCX · CSV · Markdown · JSON · HTML · code</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTextModal({ onClose, onAdd }) {
  const [name, setName] = useState('Pasted notes');
  const [text, setText] = useState('');
  return (
    <Modal
      title="Paste text as a document"
      icon={<ClipboardPaste size={18} color="var(--accent)" />}
      onClose={onClose}
      wide
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!text.trim()} onClick={() => onAdd(name.trim() || 'Pasted notes', text)}>Add document</button>
      </>}
    >
      <div className="field">
        <label htmlFor="pt-name">Name</label>
        <input id="pt-name" className="input" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pt-text"><span>Content</span><span style={{ fontWeight: 400, color: 'var(--text3)' }}>{text.length.toLocaleString()} chars</span></label>
        <textarea id="pt-text" className="textarea" style={{ minHeight: 220 }} autoFocus value={text} onChange={e => setText(e.target.value)}
          placeholder="Paste an article, meeting notes, an email thread, a transcript…" />
      </div>
    </Modal>
  );
}
