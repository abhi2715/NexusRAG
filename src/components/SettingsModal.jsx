import { useState, useEffect, useRef } from 'react';
import { Settings, Eye, EyeOff, Sun, Moon, Monitor, RefreshCw, Download, Upload, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import Modal from './Modal';
import { listModels } from '../utils/groq';
import { DEFAULT_SETTINGS, effectiveApiKey } from '../utils/settings';

import { fmtSz } from '../utils/format';

const TABS = ['General', 'Model', 'Retrieval', 'Data'];

function Toggle({ on, onChange, label, desc }) {
  return (
    <div className="row">
      <div><div className="r-t">{label}</div>{desc && <div className="r-d">{desc}</div>}</div>
      <button className={`toggle${on ? ' on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label} />
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt = v => v, hint }) {
  return (
    <div className="field">
      <label><span>{label}</span><span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</span></label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export default function SettingsModal({ settings, update, models, setModels, serverKey, onClose, onExportAll, onImportAll, onClearChats, onClearDocs, initialTab = 'General', toast }) {
  const [tab, setTab] = useState(initialTab);
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState(null); // null | 'loading' | 'ok' | error string
  const [usage, setUsage] = useState(null);
  const importRef = useRef(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then(setUsage).catch(() => {});
  }, [tab]);

  const saveKey = () => {
    if (keyDraft.trim() !== settings.apiKey) update({ apiKey: keyDraft.trim() });
  };

  const testKey = async () => {
    saveKey();
    const key = keyDraft.trim();
    if (!key && !serverKey) return setTest('Enter a key first.');
    setTest('loading');
    try {
      const list = await listModels(key);
      setModels(list);
      setTest('ok');
    } catch (e) {
      setTest(e.message);
    }
  };

  const refreshModels = async () => {
    const key = effectiveApiKey(settings);
    if (!key && !serverKey) return toast('Add an API key first.', 'error');
    try {
      setModels(await listModels(key));
      toast('Model list refreshed', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <Modal
      title="Settings"
      icon={<Settings size={18} color="var(--accent)" />}
      onClose={() => { saveKey(); onClose(); }}
      wide
      tabs={<div className="tabs" role="tablist">{TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>}
    >
      {tab === 'General' && (
        <>
          <div className="field">
            <label htmlFor="apikey">Groq API key</label>
            <div className="input-group">
              <input id="apikey" className="input" type={showKey ? 'text' : 'password'} value={keyDraft} autoComplete="off" spellCheck={false}
                placeholder={serverKey ? 'Optional: using this site’s server key' : 'gsk_…'} onChange={e => { setKeyDraft(e.target.value); setTest(null); }} onBlur={saveKey} />
              <button className="icon-btn bordered" style={{ width: 38, height: 38 }} onClick={() => setShowKey(s => !s)} aria-label={showKey ? 'Hide key' : 'Show key'}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              <button className="btn" onClick={testKey} disabled={test === 'loading'}>{test === 'loading' ? <span className="spinner" /> : 'Test'}</button>
            </div>
            {test === 'ok' && <div className="hint ok" style={{ display: 'flex', gap: 5, alignItems: 'center' }}><CheckCircle2 size={12} /> Connected. {models.length} models available.</div>}
            {test && test !== 'ok' && test !== 'loading' && <div className="hint bad" style={{ display: 'flex', gap: 5, alignItems: 'center' }}><XCircle size={12} /> {test}</div>}
            <div className="hint">
              Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>.
              It's stored only in this browser and sent only to api.groq.com.
              {serverKey && ' This site also has a built-in server key, so this field is optional; a key entered here overrides it.'}
            </div>
          </div>

          <div className="field">
            <div className="label">Theme</div>
            <div className="seg">
              {[['dark', Moon, 'Dark'], ['light', Sun, 'Light'], ['system', Monitor, 'System']].map(([v, Icon, l]) => (
                <button key={v} className={settings.theme === v ? 'active' : ''} onClick={() => update({ theme: v })}><Icon size={13} />{l}</button>
              ))}
            </div>
          </div>

          <Toggle label="Enter to send" desc="Off: use ⌘/Ctrl + Enter to send, Enter for a new line" on={settings.sendOnEnter} onChange={v => update({ sendOnEnter: v })} />
          <Toggle label="Animated cursor" desc="Custom cursor on desktop" on={settings.customCursor} onChange={v => update({ customCursor: v })} />
        </>
      )}

      {tab === 'Model' && (
        <>
          <div className="field">
            <label htmlFor="model"><span>Model</span><button className="btn btn-sm" onClick={refreshModels}><RefreshCw size={11} /> Refresh list</button></label>
            <select id="model" className="select" value={settings.model} onChange={e => update({ model: e.target.value })}>
              {!models.some(m => m.id === settings.model) && <option value={settings.model}>{settings.model}</option>}
              {models.map(m => <option key={m.id} value={m.id}>{m.id}{m.ctx ? ` · ${Math.round(m.ctx / 1024)}k ctx` : ''}</option>)}
            </select>
          </div>
          <Slider label="Temperature" value={settings.temperature} min={0} max={1.5} step={0.05} onChange={v => update({ temperature: v })} fmt={v => v.toFixed(2)}
            hint="Lower = more precise and factual. Higher = more creative." />
          <Slider label="Max response tokens" value={settings.maxTokens} min={256} max={8192} step={256} onChange={v => update({ maxTokens: v })} />
          <div className="field">
            <label htmlFor="sys">Custom instructions</label>
            <textarea id="sys" className="textarea" value={settings.systemPrompt} onChange={e => update({ systemPrompt: e.target.value })}
              placeholder="e.g. Answer in bullet points. Explain like I'm a first-year law student. Always reply in Spanish." />
            <div className="hint">Added to every request on top of the built-in RAG instructions.</div>
          </div>
        </>
      )}

      {tab === 'Retrieval' && (
        <>
          <Slider label="Passages retrieved (top-K)" value={settings.topK} min={2} max={20} step={1} onChange={v => update({ topK: v })}
            hint="How many document passages are sent to the model per question." />
          <Slider label="Context budget" value={settings.contextChars} min={4000} max={60000} step={1000} onChange={v => update({ contextChars: v })}
            fmt={v => `${Math.round(v / 1000)}k chars ≈ ${Math.round(v / 4000)}k tokens`}
            hint="Larger budgets give more context but use more tokens. Groq's free tier has per-minute token limits." />
          <Slider label="Conversation memory" value={settings.historyTurns} min={0} max={20} step={1} onChange={v => update({ historyTurns: v })}
            fmt={v => `${v} messages`} hint="Previous messages included for follow-up questions." />
          <Toggle label="Suggested follow-ups" desc="Generate 3 follow-up questions after each answer" on={settings.followUps} onChange={v => update({ followUps: v })} />
          <Toggle label="Auto-summarize uploads" desc="Create a summary and starter questions for each new document" on={settings.autoSummarize} onChange={v => update({ autoSummarize: v })} />
        </>
      )}

      {tab === 'Data' && (
        <>
          <div className="row">
            <div><div className="r-t">Storage used</div><div className="r-d">Chats and documents are stored locally in IndexedDB. Nothing is uploaded to a server.</div></div>
            <span style={{ fontSize: '.78rem', color: 'var(--text)' }}>{usage ? fmtSz(usage.usage || 0) : '—'}</span>
          </div>
          <div className="row">
            <div><div className="r-t">Backup</div><div className="r-d">Export or restore all chats as JSON</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={onExportAll}><Download size={12} /> Export</button>
              <button className="btn btn-sm" onClick={() => importRef.current?.click()}><Upload size={12} /> Import</button>
              <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={e => { e.target.files[0] && onImportAll(e.target.files[0]); e.target.value = ''; }} />
            </div>
          </div>
          <div className="row">
            <div><div className="r-t">Delete all chats</div><div className="r-d">Permanently removes every conversation</div></div>
            <button className="btn btn-sm btn-danger" onClick={onClearChats}><Trash2 size={12} /> Delete</button>
          </div>
          <div className="row">
            <div><div className="r-t">Remove all documents</div><div className="r-d">Clears the indexed document library</div></div>
            <button className="btn btn-sm btn-danger" onClick={onClearDocs}><Trash2 size={12} /> Remove</button>
          </div>
          <div className="row">
            <div><div className="r-t">Reset settings</div><div className="r-d">Restore defaults (keeps your API key)</div></div>
            <button className="btn btn-sm" onClick={() => { update({ ...DEFAULT_SETTINGS, apiKey: settings.apiKey }); toast('Settings reset', 'success'); }}>Reset</button>
          </div>
        </>
      )}
    </Modal>
  );
}
