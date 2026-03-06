import { useEffect } from 'react';
import { C, FC, FI } from '../styles/tokens';
import MsgBubble from './MsgBubble';

export default function ChatArea({ activeSession, readyDocs, loading, input, setInput, onSend, inputRef, bottomRef }) {
  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleChange = e => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
  };

  useEffect(() => {
    bottomRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length, loading, bottomRef]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.surf, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeSession?.title || 'NexusRAG'}
        </div>
        {readyDocs.slice(0, 3).map(d => {
          const f = FC[d.type] || FC.txt;
          return (
            <span key={d.id} style={{ fontSize: '0.62rem', padding: '3px 9px', borderRadius: 20, background: f.bg, color: f.tx, border: `1px solid ${f.br}`, whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {FI[d.type]} {d.name.length > 16 ? d.name.slice(0, 16) + '…' : d.name}
            </span>
          );
        })}
        {readyDocs.length > 3 && <span style={{ fontSize: '0.62rem', color: C.text3 }}>+{readyDocs.length - 3}</span>}
        <span style={{ fontSize: '0.62rem', color: C.text3, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ color: C.green }}>{readyDocs.length}</span> doc{readyDocs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 8px', scrollbarWidth: 'thin', scrollbarColor: `${C.border2} transparent` }}>

        {(!activeSession || activeSession.messages.length === 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65%', gap: 20, textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 70, height: 70, background: 'linear-gradient(135deg,#5b8ef5,#a066ff)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, boxShadow: '0 0 50px rgba(91,142,245,0.25)', animation: 'float 3s ease-in-out infinite' }}>⚡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.7rem', letterSpacing: '-0.5px' }}>NexusRAG <span style={{ color: C.accent }}>Chat</span></div>
              <div style={{ color: C.text2, fontSize: '0.84rem', marginTop: 8, lineHeight: 1.7, maxWidth: 400 }}>Upload PDF, DOCX, or CSV — then ask anything with pinpoint accuracy.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 480, width: '100%' }}>
              {[['📁','Upload','PDF, DOCX, CSV, TXT'],['🔍','Index','NLP chunking + retrieval'],['💬','Answer','Cited, precise responses']].map(([icon, t, d]) => (
                <div key={t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 12px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.border2}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.74rem', marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: '0.63rem', color: C.text3, lineHeight: 1.5 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSession?.messages.map((msg, i) => <MsgBubble key={i} msg={msg} index={i} />)}

        {loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, backgroundImage: 'linear-gradient(135deg,#5b8ef5,#a066ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>⚡</div>
            <div style={{ borderRadius: 14, borderBottomLeftRadius: 3, padding: '14px 18px', background: C.card, border: `1px solid ${C.border}`, display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: C.text3, animation: `bounce 1.2s ${j*0.2}s infinite ease-in-out` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.surf, padding: '14px 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: C.card, border: `1px solid ${C.border2}`, borderRadius: 13, padding: '10px 12px', transition: 'border-color 0.2s' }}
          onFocus={e => e.currentTarget.style.borderColor = C.accent}
          onBlur={e  => e.currentTarget.style.borderColor = C.border2}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder={readyDocs.length > 0 ? 'Ask anything about your documents…' : 'Ask anything, or upload a doc first…'}
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: C.text, fontFamily: 'inherit', fontSize: '0.84rem', resize: 'none', minHeight: 24, maxHeight: 130, lineHeight: 1.6, padding: 0, cursor: 'none' }}
          />
          <button className="clickable" onClick={onSend} disabled={loading}
            style={{ width: 36, height: 36, background: loading ? '#252840' : C.accent, border: 'none', borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#7aabff'; e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(91,142,245,0.4)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = loading ? '#252840' : C.accent; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: '0.59rem', color: C.text3, textAlign: 'center', marginTop: 7 }}>
          Enter to send · Shift+Enter for newline · {readyDocs.length} doc{readyDocs.length !== 1 ? 's' : ''} loaded
        </div>
      </div>
    </div>
  );
}
