import { useRef, useState, useMemo, memo } from 'react';
import { Zap, Plus, Search, X, UploadCloud, ClipboardPaste, Eye, Trash2, Pin, Pencil, Settings, AlertCircle, MessageSquare, CheckSquare, Square } from 'lucide-react';
import { badgeStyle, fileMeta } from '../styles/tokens';
import { fmtSz, fmtNum, relativeGroup, ACCEPT } from '../utils/format';

function DocItem({ doc, onToggle, onPreview, onRemove }) {
  const meta = fileMeta(doc.type);
  const sub = doc.status === 'error'
    ? doc.error
    : doc.status === 'processing'
      ? `Processing… ${Math.round((doc.progress || 0) * 100)}%`
      : [doc.pages && `${doc.pages} pages`, doc.rows && `${fmtNum(doc.rows)} rows`, `${fmtNum(doc.words)} words`, fmtSz(doc.size)].filter(Boolean).join(' · ');

  return (
    <div className={`doc-item${doc.enabled === false ? ' disabled' : ''}`} style={doc.status === 'error' ? { borderColor: 'rgba(240,85,85,.35)' } : undefined}>
      <div className="doc-icon" style={badgeStyle(doc.type)}>{doc.status === 'processing' ? <span className="spinner" /> : meta.label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button className="doc-name" style={{ display: 'block', width: '100%' }} onClick={() => doc.status === 'ready' && onPreview(doc)} title={doc.name}>{doc.name}</button>
        <div className="doc-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: doc.status === 'error' ? 'var(--red)' : undefined }} title={sub}>
          {doc.status === 'error' && <AlertCircle size={10} style={{ verticalAlign: -1, marginRight: 3 }} />}{sub}
        </div>
        {doc.status === 'processing' && <div className="doc-progress"><div style={{ width: `${Math.max(5, (doc.progress || 0) * 100)}%` }} /></div>}
      </div>
      {doc.status === 'ready' && (
        <>
          <button className="icon-btn sm hide-mobile" onClick={() => onPreview(doc)} title="Preview"><Eye size={12} /></button>
          <button className={`toggle${doc.enabled !== false ? ' on' : ''}`} onClick={() => onToggle(doc.id)} title={doc.enabled !== false ? 'Included in answers (click to exclude)' : 'Excluded (click to include)'} aria-label="Include in context" />
        </>
      )}
      <button className="icon-btn sm danger" onClick={() => onRemove(doc)} title="Remove"><Trash2 size={12} /></button>
    </div>
  );
}

function HistoryItem({ session, active, onSelect, onRename, onTogglePin, onDelete }) {
  const count = session.messages.filter(m => m.role === 'user').length;
  return (
    <div className={`history-item clickable${active ? ' active' : ''}`} role="button" tabIndex={0} onClick={onSelect}
      onKeyDown={e => e.key === 'Enter' && onSelect()}>
      <div className="h-title">{session.pinned && <Pin size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</span></div>
      <div className="h-meta">{count} message{count !== 1 ? 's' : ''}</div>
      <div className="h-actions" onClick={e => e.stopPropagation()}>
        <button className="icon-btn sm" onClick={onRename} title="Rename"><Pencil size={11} /></button>
        <button className={`icon-btn sm${session.pinned ? ' active' : ''}`} onClick={onTogglePin} title={session.pinned ? 'Unpin' : 'Pin'}><Pin size={11} /></button>
        <button className="icon-btn sm danger" onClick={onDelete} title="Delete"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

function Sidebar({
  open, isMobile, onClose, docs, onFiles, onAddText, onToggleDoc, onSetAllDocs, onPreviewDoc, onRemoveDoc,
  sessions, activeId, onSelect, onNew, onRename, onTogglePin, onDelete, onOpenSettings, hasKey, model, dragging,
}) {
  const fileRef = useRef(null);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sessions.filter(s => s.title.toLowerCase().includes(q) || s.messages.some(m => m.content?.toLowerCase().includes(q)))
      : sessions;
    const out = [];
    const pinned = list.filter(s => s.pinned);
    if (pinned.length) out.push(['Pinned', pinned]);
    const byGroup = new Map();
    list.filter(s => !s.pinned).forEach(s => {
      const g = relativeGroup(s.updatedAt || s.createdAt);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(s);
    });
    return [...out, ...byGroup];
  }, [sessions, query]);

  const ready = docs.filter(d => d.status === 'ready');
  const allOn = ready.length > 0 && ready.every(d => d.enabled !== false);

  const cls = `sidebar${isMobile ? (open ? ' open' : '') : (open ? '' : ' collapsed')}`;

  return (
    <aside className={cls} aria-label="Sidebar">
      <div className="sidebar-section">
        <div className="brand">
          <div className="logo"><Zap size={17} /></div>
          <div className="brand-name">Nexus<span>RAG</span></div>
          {isMobile && <button className="icon-btn bordered" onClick={onClose} aria-label="Close sidebar"><X size={15} /></button>}
        </div>
        <button className="btn btn-soft btn-block" onClick={onNew} style={{ justifyContent: 'flex-start' }}>
          <Plus size={15} /> New chat <span style={{ marginLeft: 'auto' }} className="kbd hide-mobile">⌘⇧O</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-label">
          <span>Documents</span>
          {ready.length > 1 && (
            <button className="count" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: '.62rem' }} onClick={() => onSetAllDocs(!allOn)}>
              {allOn ? <CheckSquare size={11} /> : <Square size={11} />} {allOn ? 'All on' : 'Enable all'}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
        <button className={`dropzone${dragging ? ' drag' : ''}`} onClick={() => fileRef.current?.click()}>
          <UploadCloud size={20} color="var(--accent)" />
          <div className="dz-title"><b>Click</b> or drop files anywhere</div>
          <div className="dz-sub">PDF · DOCX · CSV · MD · JSON · HTML · code · up to 50 MB</div>
        </button>
        <button className="btn btn-sm btn-block" style={{ marginTop: 6 }} onClick={onAddText}><ClipboardPaste size={12} /> Paste text as document</button>
        {docs.length > 0 && (
          <div className="doc-list">
            {docs.map(d => <DocItem key={d.id} doc={d} onToggle={onToggleDoc} onPreview={onPreviewDoc} onRemove={onRemoveDoc} />)}
          </div>
        )}
      </div>

      <div className="history">
        <div className="search-box">
          <Search size={13} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats…" aria-label="Search chats" />
          {query && <button className="icon-btn sm" onClick={() => setQuery('')} aria-label="Clear search"><X size={12} /></button>}
        </div>
        {sessions.length === 0 && (
          <div style={{ fontSize: '.72rem', color: 'var(--text3)', textAlign: 'center', paddingTop: 20, lineHeight: 1.7 }}>
            <MessageSquare size={18} style={{ marginBottom: 6 }} /><br />No chats yet.<br />Ask a question to start one.
          </div>
        )}
        {sessions.length > 0 && groups.length === 0 && (
          <div style={{ fontSize: '.72rem', color: 'var(--text3)', textAlign: 'center', paddingTop: 16 }}>No chats match “{query}”.</div>
        )}
        {groups.map(([label, list]) => (
          <div key={label}>
            <div className="history-group">{label}</div>
            {list.map(s => (
              <HistoryItem
                key={s.id}
                session={s}
                active={s.id === activeId}
                onSelect={() => onSelect(s.id)}
                onRename={() => onRename(s.id)}
                onTogglePin={() => onTogglePin(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <span className="status-dot" style={{ background: hasKey ? 'var(--green)' : 'var(--yellow)', boxShadow: `0 0 8px ${hasKey ? 'var(--green)' : 'var(--yellow)'}` }} />
        <span style={{ fontSize: '.66rem', color: 'var(--text2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hasKey ? model.split('/').pop() : 'No API key set'}
        </span>
        <button className="icon-btn sm" onClick={onOpenSettings} title="Settings"><Settings size={14} /></button>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
