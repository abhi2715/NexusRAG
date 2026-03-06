import { useRef } from 'react';
import { C, FC, FI } from '../styles/tokens';
import HistoryItem from './HistoryItem';

export default function Sidebar({ docs, processing, dragging, setDragging, handleFiles, removeDoc, sessions, activeId, setActiveId, newSession, onDeleteSession }) {
  const fileRef = useRef();
  const readyDocs = docs.filter(d => d.status === 'ready');

  return (
    <aside style={{ width: 264, minWidth: 264, background: C.side, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Brand */}
      <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#5b8ef5,#a066ff)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, boxShadow: '0 0 16px rgba(91,142,245,0.25)' }}>⚡</div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Nexus<span style={{ color: C.accent }}>RAG</span></div>
        </div>
        <button className="clickable" onClick={() => newSession()} style={{ width: '100%', padding: '8px 12px', background: C.accentGlow, border: `1px solid ${C.border2}`, borderRadius: 9, color: C.accent, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,142,245,0.2)'; e.currentTarget.style.borderColor = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.accentGlow; e.currentTarget.style.borderColor = C.border2; }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Conversation
        </button>
      </div>

      {/* Upload zone */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.text3, display: 'block', marginBottom: 8 }}>Documents</span>
        <div className="clickable"
          onClick={() => fileRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          style={{ border: `1.5px dashed ${dragging ? C.accent : C.border2}`, borderRadius: 10, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', background: dragging ? C.accentGlow : C.card, transition: 'all 0.2s' }}>
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.doc,.csv,.txt" style={{ display: 'none' }} onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
          <div style={{ fontSize: 18, marginBottom: 4 }}>📎</div>
          <div style={{ fontSize: '0.72rem', color: C.text2, lineHeight: 1.5 }}><span style={{ color: C.accent, fontWeight: 600 }}>Click</span> or drag & drop</div>
          <div style={{ fontSize: '0.59rem', color: C.text3, marginTop: 3 }}>PDF · DOCX · CSV · TXT</div>
        </div>

        {processing && (
          <div style={{ fontSize: '0.65rem', color: C.accent, marginTop: 6, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, animation: 'pulse 1s infinite' }} />
            {processing}
          </div>
        )}

        <div style={{ maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>
          {docs.map(d => {
            const f = FC[d.type] || FC.txt;
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 9px', background: C.card, border: `1px solid ${d.status === 'ready' ? f.br : C.border}`, borderRadius: 7, fontSize: '0.68rem', color: C.text2, marginTop: 4, transition: 'border-color 0.2s' }}>
                <span>{FI[d.type] || '📄'}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: d.status === 'ready' ? C.text : C.text2 }}>{d.name}</span>
                <span style={{ fontSize: '0.57rem', color: C.text3, flexShrink: 0 }}>{d.size}</span>
                {d.status === 'processing' && <span style={{ fontSize: '0.58rem', color: C.accent }}>…</span>}
                {d.status === 'error'      && <span style={{ fontSize: '0.58rem', color: C.red }}>✕</span>}
                <button className="clickable" onClick={() => removeDoc(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, fontSize: 10, padding: 2, flexShrink: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                  onMouseLeave={e => e.currentTarget.style.color = C.text3}>✕</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: C.text3 }}>History</span>
          {sessions.length > 0 && <span style={{ fontSize: '0.58rem', color: C.text3 }}>{sessions.length} chat{sessions.length !== 1 ? 's' : ''}</span>}
        </div>
        {sessions.length === 0 && (
          <div style={{ fontSize: '0.7rem', color: C.text3, textAlign: 'center', paddingTop: 16, lineHeight: 1.7 }}>
            No chats yet.<br />Start by asking a question!
          </div>
        )}
        {sessions.map(s => (
          <HistoryItem
            key={s.id}
            session={s}
            isActive={s.id === activeId}
            docs={docs}
            onClick={() => setActiveId(s.id)}
            onDelete={() => onDeleteSession(s.id)}
          />
        ))}
      </div>
    </aside>
  );
}
