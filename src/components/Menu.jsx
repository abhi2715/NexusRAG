import { useEffect, useRef } from 'react';

/** Popover menu. Render inside a `position: relative` wrapper. */
export default function Menu({ open, onClose, children, placement = 'bottom-end', style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = e => e.key === 'Escape' && onClose();
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  const [v, h] = placement.split('-');
  const pos = {
    ...(v === 'top' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
    ...(h === 'start' ? { left: 0 } : { right: 0 }),
  };
  return <div ref={ref} className="menu" role="menu" style={{ ...pos, ...style }}>{children}</div>;
}

export function MenuItem({ icon: Icon, children, sub, onClick, on, danger }) {
  return (
    <button role="menuitem" className={`menu-item${on ? ' on' : ''}`} onClick={onClick} style={danger ? { color: 'var(--red)' } : undefined}>
      {Icon && <Icon size={14} />}
      <span>{children}</span>
      {sub && <span className="mi-sub">{sub}</span>}
    </button>
  );
}
