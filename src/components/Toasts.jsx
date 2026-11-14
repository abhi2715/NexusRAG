import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);

  const toast = useCallback((message, type = 'info', ms = 3500) => {
    const id = ++idRef.current;
    setToasts(t => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast ${t.type}`}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button className="icon-btn sm" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={13} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
