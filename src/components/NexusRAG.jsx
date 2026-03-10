import { useState, useCallback, useEffect, useRef } from 'react';
import Cursor from './Cursor';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { C } from '../styles/tokens';
import { useSessions } from '../hooks/useSessions';
import { useDocs } from '../hooks/useDocs';
import { retrieveChunks } from '../utils/nlp';
import { groqChat } from '../utils/groq';

export default function NexusRAG() {
  const {
    sessions,
    activeId,
    setActiveId,
    activeSession,
    newSession,
    updateSession,
    deleteSession,
  } = useSessions();

  const {
    docs,
    processing,
    dragging,
    setDragging,
    handleFiles,
    removeDoc,
  } = useDocs();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, loading]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const readyDocs = docs.filter((d) => d.status === 'ready');
    const sid = activeId ?? newSession(text.slice(0, 45));

    const userMsg = {
      role: 'user',
      content: text,
      ts: new Date().toISOString(),
    };

    updateSession(sid, (s) => ({
      ...s,
      title: s.title === 'New Chat' ? text.slice(0, 45) : s.title,
      docIds: readyDocs.map((d) => d.id),
      messages: [...s.messages, userMsg],
    }));

    setLoading(true);

    try {
      // RAG retrieval
      const pdfDocs = readyDocs.filter((d) => d.b64);
      const chunks = retrieveChunks(text, readyDocs, 6);
      const usedNames = new Set(chunks.map((c) => c.docName));

      let ctx = '';
      let ctxLen = 0;

      for (const c of chunks) {
        if (ctxLen >= 9000) break;
        const p = `[${c.docName}]\n${c.chunk}\n\n`;
        ctx += p;
        ctxLen += p.length;
      }

      if (!ctx && readyDocs.length > 0) {
        for (const d of readyDocs) {
          ctx += `[${d.name}]\n${d.content.slice(0, 2500)}\n\n`;
          usedNames.add(d.name);
        }
      }

      const pdfNote =
        pdfDocs.length > 0
          ? `\n\nPDF documents: ${pdfDocs.map((d) => d.name).join(', ')}.`
          : '';

      const system =
        readyDocs.length > 0
          ? `You are NexusRAG, a precise AI document analyst. Documents: ${readyDocs
              .map((d) => d.name)
              .join(', ')}.${
              ctx ? `\n\nDocument context:\n${ctx}` : ''
            }${pdfNote}\nAnswer precisely. Be specific with names, numbers, dates. If unsure, say so.`
          : 'You are NexusRAG, a helpful AI assistant. Answer helpfully.';

      // Build history (last 6 turns)
      const currentSess = sessions.find((s) => s.id === sid) ?? { messages: [] };
      const history = [...currentSess.messages, userMsg]
        .slice(-7, -1)
        .filter((m) => typeof m.content === 'string')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));

      const userText =
        pdfDocs.length > 0
          ? `[PDFs uploaded: ${pdfDocs.map((d) => d.name).join(', ')}]\n\n${text}`
          : text;

      const aiText = await groqChat(system, history, userText);

      const sources = readyDocs
        .filter((d) => usedNames.has(d.name))
        .map((d) => ({ name: d.name, type: d.type }));

      const aiMsg = {
        role: 'assistant',
        content: aiText,
        ts: new Date().toISOString(),
        sources,
      };

      updateSession(sid, (s) => ({ ...s, messages: [...s.messages, aiMsg] }));
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `**Error:** ${err.message}`,
        ts: new Date().toISOString(),
        sources: [],
      };
      updateSession(sid, (s) => ({ ...s, messages: [...s.messages, errMsg] }));
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, loading, activeId, docs, sessions, newSession, updateSession]);

  const readyDocs = docs.filter((d) => d.status === 'ready');

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: C.bg,
        fontFamily: "'Inter',system-ui,sans-serif",
        color: C.text,
        overflow: 'hidden',
        cursor: 'none',
      }}
    >
      <Cursor />

      {/* ── Delete confirm modal ── */}
      {confirmDel !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: C.side,
              border: `1px solid ${C.border2}`,
              borderRadius: 16,
              padding: '28px 32px',
              maxWidth: 340,
              width: '90%',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
              Delete Chat?
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                color: C.text2,
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              This will permanently delete this conversation and cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="clickable"
                onClick={() => setConfirmDel(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  background: 'transparent',
                  border: `1px solid ${C.border2}`,
                  borderRadius: 9,
                  color: C.text2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.8rem',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.accent;
                  e.currentTarget.style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border2;
                  e.currentTarget.style.color = C.text2;
                }}
              >
                Cancel
              </button>
              <button
                className="clickable"
                onClick={() => {
                  deleteSession(confirmDel);
                  setConfirmDel(null);
                }}
                style={{
                  flex: 1,
                  padding: '9px',
                  background: 'rgba(240,85,85,0.12)',
                  border: '1px solid rgba(240,85,85,0.3)',
                  borderRadius: 9,
                  color: C.red,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(240,85,85,0.22)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(240,85,85,0.12)';
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        docs={docs}
        processing={processing}
        dragging={dragging}
        setDragging={setDragging}
        handleFiles={handleFiles}
        removeDoc={removeDoc}
        sessions={sessions}
        activeId={activeId}
        setActiveId={setActiveId}
        newSession={newSession}
        onDeleteSession={(id) => setConfirmDel(id)}
      />

      <ChatArea
        activeSession={activeSession}
        readyDocs={readyDocs}
        loading={loading}
        input={input}
        setInput={setInput}
        onSend={send}
        inputRef={inputRef}
        bottomRef={bottomRef}
      />

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.35} 30%{transform:translateY(-6px);opacity:1} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse  { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #22253a; border-radius: 4px; }
        ::selection { background: rgba(91,142,245,0.25); }
        textarea, input { cursor: none !important; }
      `}</style>
    </div>
  );
}
