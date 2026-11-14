import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { Copy, Check, RefreshCw, Pencil, Volume2, VolumeX, Zap, User, CornerDownRight, AlertTriangle, Square } from 'lucide-react';
import MD from './MD';
import { fmtTime } from '../utils/format';
import { badgeStyle, fileMeta } from '../styles/tokens';

function SourceChips({ sources, onOpen }) {
  // one chip per source number, grouped visually by doc
  return (
    <div className="sources">
      {sources.map(s => (
        <button key={s.n} className="source-chip" onClick={() => onOpen(s)} title={s.text ? s.text.slice(0, 280) + '…' : s.docName}>
          <span className="n">{s.n}</span>
          <span className="doc-icon" style={{ ...badgeStyle(s.docType), width: 'auto', height: 16, padding: '0 4px', fontSize: '.5rem' }}>
            {fileMeta(s.docType).label}
          </span>
          <span className="nm">{s.docName}{s.page ? ` · p.${s.page}` : ''}</span>
        </button>
      ))}
    </div>
  );
}

function MsgBubble({ msg, isLast, busy, onOpenSource, onRegenerate, onEdit, onSpeak, speaking, onFollowUp, showFollowUps }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const editRef = useRef(null);
  const isUser = msg.role === 'user';

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [editing]);

  const copy = () => {
    navigator.clipboard?.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submitEdit = () => {
    const t = draft.trim();
    setEditing(false);
    if (t && t !== msg.content) onEdit(t);
  };

  const onCite = n => {
    const s = msg.sources?.find(x => x.n === n);
    if (s) onOpenSource(s);
  };

  const citeSet = useMemo(() => new Set((msg.sources || []).map(x => x.n)), [msg.sources]);
  const s = msg.stats;

  return (
    <div className={`msg ${isUser ? 'user' : 'assistant'}${isLast ? ' last' : ''}`}>
      <div className="avatar">{isUser ? <User size={15} /> : <Zap size={15} />}</div>
      <div className="msg-body">
        <div className="msg-head">
          <b>{isUser ? 'You' : 'NexusRAG'}</b>
          <span>{fmtTime(msg.ts)}</span>
          {msg.edited && <span>· edited</span>}
        </div>

        {editing ? (
          <div className="edit-box">
            <textarea
              ref={editRef}
              value={draft}
              onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                if (e.key === 'Escape') { setEditing(false); setDraft(msg.content); }
              }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="btn btn-sm" onClick={() => { setEditing(false); setDraft(msg.content); }}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={submitEdit}>Save &amp; resend</button>
            </div>
          </div>
        ) : (
          <div className={`bubble${msg.error ? ' error' : ''}`}>
            {isUser ? msg.content : msg.pending && !msg.content ? (
              <div className="stage"><span className="spinner" />{msg.stage || 'Thinking…'}</div>
            ) : (
              <>
                {msg.error && <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--red)', fontWeight: 600, fontSize: '.78rem', marginBottom: 4 }}><AlertTriangle size={14} /> Something went wrong</div>}
                <MD text={msg.content} onCite={onCite} cites={citeSet} />
                {msg.pending && <span className="cursor-blink" />}
                {msg.stopped && <div style={{ fontSize: '.66rem', color: 'var(--text3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Square size={10} /> Generation stopped</div>}
              </>
            )}
          </div>
        )}

        {!isUser && !msg.pending && msg.sources?.length > 0 && <SourceChips sources={msg.sources} onOpen={onOpenSource} />}

        {!msg.pending && !editing && (
          <div className="msg-actions">
            <button className="icon-btn sm" onClick={copy} title="Copy">{copied ? <Check size={13} color="var(--green)" /> : <Copy size={13} />}</button>
            {isUser && !busy && <button className="icon-btn sm" onClick={() => { setDraft(msg.content); setEditing(true); }} title="Edit & resend"><Pencil size={13} /></button>}
            {!isUser && onSpeak && <button className={`icon-btn sm${speaking ? ' active' : ''}`} onClick={onSpeak} title={speaking ? 'Stop reading' : 'Read aloud'}>{speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}</button>}
            {!isUser && isLast && !busy && <button className="icon-btn sm" onClick={onRegenerate} title="Regenerate"><RefreshCw size={13} /></button>}
            {!isUser && s && (
              <span className="msg-stats">
                {s.model && <span>{s.model.split('/').pop()}</span>}
                {s.ms != null && <span>{(s.ms / 1000).toFixed(1)}s</span>}
                {s.tps && <span>{Math.round(s.tps)} tok/s</span>}
                {s.tokens && <span>{s.tokens} tokens</span>}
              </span>
            )}
          </div>
        )}

        {showFollowUps && isLast && !busy && msg.followUps?.length > 0 && (
          <div className="followups">
            {msg.followUps.map(q => (
              <button key={q} className="followup" onClick={() => onFollowUp(q)}>
                <CornerDownRight size={13} style={{ flexShrink: 0, color: 'var(--accent)' }} />{q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MsgBubble);
