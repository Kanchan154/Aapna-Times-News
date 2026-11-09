import { createContext, useCallback, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONE = { success: 'border-emerald-500', error: 'border-signal-500', info: 'border-indigo-600' };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = (id) => setItems((l) => l.filter((t) => t.id !== id));

  const push = useCallback((type, message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, type, message, to: opts.to }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), opts.ms || 5000);
  }, []);

  const toast = {
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
        {items.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div key={t.id} role="status" className={`pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-lg border-l-4 bg-white p-3 shadow-lg ring-1 ring-black/5 ${TONE[t.type]}`}>
              <Icon size={18} className="mt-0.5 shrink-0 text-ink-soft" />
              <div className="min-w-0 flex-1 text-sm">
                {t.to ? <Link to={t.to} onClick={() => remove(t.id)} className="font-semibold hover:underline">{t.message}</Link> : <span>{t.message}</span>}
              </div>
              <button onClick={() => remove(t.id)} aria-label="हटाएँ" className="text-ink-faint hover:text-ink"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
