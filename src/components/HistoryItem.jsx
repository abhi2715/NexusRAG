import { useState } from 'react';
import { C, FC } from '../styles/tokens';
import { fmtDate } from '../utils/format';

export default function HistoryItem({ session, isActive, onClick, onDelete, docs }) {
  const [hovered, setHovered] = useState(false);

  const msgCount  = session.messages.filter(m => m.role === 'user').length;
  const docTypes  = [...new Set(
    (session.docIds || [])
      .map(id => docs.find(x => x.id === id)?.type)
      .filter(Boolean)
  )];

  return (
    <div
      className="clickable"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 3,
        position: 'relative',
        background: isActive ? '#12131d' : hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
        border: `1px solid ${isActive ? C.border2 : hovered ? C.border : 'transparent'}`,
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 26, color: isActive ? C.text : C.text2 }}>
        {session.title}
      </div>
      <div style={{ fontSize: '0.6rem', color: C.text3, marginTop: 2 }}>
        {fmtDate(session.createdAt)} · {msgCount} msg{msgCount !== 1 ? 's' : ''}
      </div>

      {docTypes.length > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
          {docTypes.map(t => {
            const f = FC[t] || FC.txt;
            return (
              <span key={t} style={{ fontSize: '0.54rem', padding: '1px 5px', borderRadius: 5, background: f.bg, color: f.tx, border: `1px solid ${f.br}`, fontWeight: 700 }}>
                {t.toUpperCase()}
              </span>
            );
          })}
        </div>
      )}

      {/* Delete button */}
      <button
        className="clickable"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{
          position: 'absolute', right: 8, top: 8, width: 22, height: 22, borderRadius: 6,
          background: hovered ? 'rgba(240,85,85,0.12)' : 'transparent',
          border: `1px solid ${hovered ? 'rgba(240,85,85,0.3)' : 'transparent'}`,
          color: hovered ? C.red : C.text3,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, transition: 'all 0.15s ease', opacity: hovered ? 1 : 0.4,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>
  );
}
