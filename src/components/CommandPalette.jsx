import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MessageSquare, CornerDownLeft } from 'lucide-react';
import { useEscape } from './Modal';

/**
 * ⌘K palette. `actions`: [{ id, label, icon, hint, group, run }].
 * Chats are searched by title and message content.
 */
export default function CommandPalette({ actions, sessions, onSelectSession, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const listRef = useRef(null);
  useEscape(onClose);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const acts = actions.filter(a => !query || a.label.toLowerCase().includes(query));
    const chats = sessions
      .map(s => {
        if (!query) return { s, snippet: null };
        if (s.title.toLowerCase().includes(query)) return { s, snippet: null };
        const m = s.messages.find(x => x.content?.toLowerCase().includes(query));
        if (!m) return null;
        const i = m.content.toLowerCase().indexOf(query);
        return { s, snippet: '…' + m.content.slice(Math.max(0, i - 30), i + 60).replace(/\s+/g, ' ') + '…' };
      })
      .filter(Boolean)
      .slice(0, query ? 20 : 6)
      .map(({ s, snippet }) => ({ id: s.id, label: s.title, sub: snippet, icon: MessageSquare, group: query ? 'Chats' : 'Recent chats', run: () => onSelectSession(s.id) }));
    return [...acts, ...chats];
  }, [q, actions, sessions, onSelectSession]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const run = item => { onClose(); item.run(); };

  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && items[sel]) { e.preventDefault(); run(items[sel]); }
  };

  let lastGroup = null;
  return (
    <div className="overlay top" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-label="Command palette">
        <div className="palette-input">
          <Search size={16} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search chats or type a command…" aria-label="Command" />
          <span className="kbd">Esc</span>
        </div>
        <div className="palette-list" ref={listRef}>
          {items.length === 0 && <div className="palette-empty">No results for “{q}”</div>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? <div className="palette-group">{it.group}</div> : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <div key={it.group + it.id}>
                {header}
                <button className={`palette-item${i === sel ? ' sel' : ''}`} onMouseMove={() => setSel(i)} onClick={() => run(it)}>
                  {Icon && <Icon size={15} />}
                  <span className="pi-label">{it.label}{it.sub && <div className="pi-sub">{it.sub}</div>}</span>
                  {it.hint && <span className="kbd">{it.hint}</span>}
                  {i === sel && !it.hint && <CornerDownLeft size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
