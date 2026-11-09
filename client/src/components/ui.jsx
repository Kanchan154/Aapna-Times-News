import { cloneElement, isValidElement, useEffect, useId } from 'react';
import { Loader2, AlertTriangle, Inbox, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { img } from '../lib/api';
import { initials } from '../lib/format';

export const Spinner = ({ label = 'लोड हो रहा है…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-ink-soft" role="status">
    <Loader2 className="animate-spin" size={20} /> <span className="text-sm">{label}</span>
  </div>
);

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded bg-mist ${className}`} />;

export const EmptyState = ({ title = 'यहाँ अभी कुछ नहीं है', text, action, icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center rounded-lg border border-dashed border-mist-line px-6 py-14 text-center">
    <Icon size={30} className="text-ink-faint" />
    <h3 className="mt-3 text-lg font-bold">{title}</h3>
    {text && <p className="mt-1 max-w-md text-sm text-ink-soft">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center rounded-lg border border-signal-500/30 bg-signal-500/5 px-6 py-10 text-center">
    <AlertTriangle className="text-signal-500" />
    <p className="mt-2 text-sm font-semibold">{message || 'कुछ गड़बड़ हो गई।'}</p>
    {onRetry && <button onClick={onRetry} className="btn-outline btn-sm mt-3">फिर कोशिश करें</button>}
  </div>
);

export const Avatar = ({ user, size = 36 }) =>
  user?.avatar ? (
    <img src={img(user.avatar)} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-700 font-bold text-white">
      {initials(user?.name) || '?'}
    </span>
  );

const STATUS = {
  published: 'bg-emerald-100 text-emerald-800', pending: 'bg-amber-100 text-amber-800', draft: 'bg-slate-200 text-slate-700',
  rejected: 'bg-red-100 text-signal-600', visible: 'bg-emerald-100 text-emerald-800', hidden: 'bg-slate-200 text-slate-700',
  admin: 'bg-indigo-100 text-indigo-800', reporter: 'bg-marigold-100 text-amber-900', reader: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-800', paused: 'bg-slate-200 text-slate-700', inactive: 'bg-red-100 text-signal-600',
};
export const STATUS_HI = {
  published: 'पब्लिश', pending: 'समीक्षा में', draft: 'ड्राफ़्ट', rejected: 'अस्वीकृत', visible: 'दिख रहा', hidden: 'छिपा',
  admin: 'एडमिन', reporter: 'रिपोर्टर', reader: 'पाठक', active: 'चालू', paused: 'रुका हुआ', inactive: 'बंद',
};
export const Badge = ({ value, label }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[value] || 'bg-mist'}`}>{label || STATUS_HI[value] || value}</span>
);

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i += 1) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
  const withGaps = nums.flatMap((n, i) => (i && n - nums[i - 1] > 1 ? ['…', n] : [n]));
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="पेज नंबर">
      <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="पिछला पेज"><ChevronLeft size={14} /></button>
      {withGaps.map((n, i) => n === '…'
        ? <span key={`g${i}`} className="px-2 text-ink-faint">…</span>
        : <button key={n} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}
            className={`btn btn-sm min-w-8 ${n === page ? 'bg-indigo-700 text-white' : 'border border-mist-line bg-white hover:bg-mist'}`}>{n}</button>)}
      <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="अगला पेज"><ChevronRight size={14} /></button>
    </nav>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-lg animate-pop overflow-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-mist-line px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="बंद करें" className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-mist-line bg-mist/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export const ConfirmDialog = ({ open, onClose, onConfirm, title, text, confirmLabel = 'पक्का करें', danger, busy }) => (
  <Modal open={open} onClose={onClose} title={title}
    footer={<><button className="btn-outline" onClick={onClose}>रद्द करें</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy ? 'थोड़ा रुकिए…' : confirmLabel}</button></>}>
    <p className="text-sm text-ink-soft">{text}</p>
  </Modal>
);

export const Field = ({ label, error, hint, children }) => {
  const id = useId();
  // Link the label to its (single) child control so screen readers announce it.
  const single = isValidElement(children) && typeof children.type === 'string';
  const control = single ? cloneElement(children, { id: children.props.id || id, 'aria-invalid': error ? true : undefined }) : children;
  return (
    <div>
      {label && <label className="label" htmlFor={single ? children.props.id || id : undefined}>{label}</label>}
      {control}
      {hint && !error && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-signal-600">{error}</p>}
    </div>
  );
};

export const PageTitle = ({ title, sub, actions }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-extrabold">{title}</h1>{sub && <p className="text-sm text-ink-soft">{sub}</p>}</div>
    {actions}
  </div>
);
