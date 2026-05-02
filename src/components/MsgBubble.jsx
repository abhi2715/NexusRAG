import { useState, useEffect } from 'react';
import MD from './MD';
import { C, FC, FI } from '../styles/tokens';
import { fmtTime } from '../utils/format';

export default function MsgBubble({ msg, index, isMobile }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 30);
    return () => clearTimeout(t);
  }, [index]);

  const isUser = msg.role === 'user';

  return (
    <div style={{
      display: 'flex', gap: isMobile ? 8 : 10, flexDirection: isUser ? 'row-reverse' : 'row',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease', marginBottom: isMobile ? 14 : 20,
    }}>
      {/* Avatar */}
      <div style={{
        width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 9, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: isMobile ? 12 : 14, flexShrink: 0, marginTop: 2,
        background: isUser ? '#141528' : undefined,
        backgroundImage: isUser ? undefined : 'linear-gradient(135deg,#5b8ef5,#a066ff)',
        border: isUser ? `1px solid ${C.border2}` : undefined,
      }}>
        {isUser ? '👤' : '⚡'}
      </div>

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        maxWidth: isMobile ? 'calc(100% - 44px)' : 640,
        minWidth: 0,
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        <div style={{ fontSize: '0.6rem', color: C.text3, display: 'flex', gap: 8 }}>
          <span style={{ fontWeight: 600, color: C.text2 }}>{isUser ? 'You' : 'NexusRAG'}</span>
          <span>{fmtTime(msg.ts)}</span>
        </div>

        <div style={{
          borderRadius: 14, padding: isMobile ? '10px 12px' : '11px 16px', fontSize: isMobile ? '0.8rem' : '0.83rem', lineHeight: 1.75,
          background: isUser ? '#111830' : C.card,
          border: `1px solid ${isUser ? 'rgba(91,142,245,0.18)' : C.border}`,
          borderBottomRightRadius: isUser ? 3 : 14,
          borderBottomLeftRadius:  isUser ? 14 : 3,
          boxShadow: isUser ? 'none' : '0 2px 12px rgba(0,0,0,0.2)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}>
          {isUser ? msg.content : <MD text={msg.content} />}
        </div>

        {/* Source chips */}
        {!isUser && msg.sources?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {msg.sources.map((s, si) => {
              const f = FC[s.type] || FC.txt;
              return (
                <span key={si} style={{
                  fontSize: '0.58rem', padding: '2px 8px', borderRadius: 8,
                  background: f.bg, color: f.tx, border: `1px solid ${f.br}`,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {FI[s.type]} {s.name.length > 22 ? s.name.slice(0, 22) + '…' : s.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
