import { useEffect } from 'react';
import { X } from 'lucide-react';

export function useEscape(handler, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); handler(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, active]);
}

export default function Modal({ title, icon, onClose, children, footer, wide, tabs }) {
  useEscape(onClose);
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {icon}
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {tabs}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={<>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={onConfirm}>{confirmLabel}</button>
      </>}
    >
      {message}
    </Modal>
  );
}
