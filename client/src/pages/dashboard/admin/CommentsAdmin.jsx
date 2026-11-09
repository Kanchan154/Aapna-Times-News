import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, Eye, Trash2 } from 'lucide-react';
import { api, errMsg } from '../../../lib/api';
import useFetch from '../../../hooks/useFetch';
import { useToast } from '../../../context/ToastContext';
import { timeAgo } from '../../../lib/format';
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageTitle, Pagination, Spinner } from '../../../components/ui';

export default function CommentsAdmin() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/admin/comments', { params: { status: status || undefined, page } });
  const [del, setDel] = useState(null);
  const toast = useToast();
  const toggle = async (c) => { try { await api.put(`/admin/comments/${c._id}/toggle`); toast.success(c.status === 'visible' ? 'कमेंट छिपा दिया गया।' : 'कमेंट फिर दिखने लगा।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } };
  const remove = async () => { try { await api.delete(`/comments/${del._id}`); toast.success('कमेंट हटा दिया गया।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } finally { setDel(null); } };

  return (
    <>
      <PageTitle title="कमेंट" sub="नियम तोड़ने वाले कमेंट छिपाइए या हटाइए।" />
      <div className="mb-4 flex gap-2">{[['', 'सभी'], ['visible', 'दिख रहे'], ['hidden', 'छिपे हुए']].map(([v, l]) => <button key={l} onClick={() => { setStatus(v); setPage(1); }} aria-pressed={status === v} className={`rounded-full px-3 py-1 text-sm font-semibold ${status === v ? 'bg-indigo-700 text-white' : 'bg-white text-ink-soft ring-1 ring-mist-line'}`}>{l}</button>)}</div>
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.comments.length && <EmptyState title="कोई कमेंट नहीं" />}
      <ul className="space-y-3">{data?.comments.map((c) => (
        <li key={c._id} className="panel flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1"><p className="break-words text-sm">{c.text}</p>
            <p className="mt-1 text-xs text-ink-faint"><b>{c.user?.name || 'हटाया गया यूज़र'}</b> ने <Link className="text-indigo-700 hover:underline" to={`/article/${c.article?.slug}`}>{c.article?.title}</Link> · {timeAgo(c.createdAt)}</p></div>
          <div className="flex items-center gap-1"><Badge value={c.status} />
            <button className="btn-outline btn-sm" onClick={() => toggle(c)}>{c.status === 'visible' ? <><EyeOff size={14} /> छिपाएँ</> : <><Eye size={14} /> दिखाएँ</>}</button>
            <button className="btn-ghost btn-sm text-signal-600" onClick={() => setDel(c)} aria-label="कमेंट हटाएँ"><Trash2 size={14} /></button></div>
        </li>))}</ul>
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} danger confirmLabel="हटाएँ" title="कमेंट हटाएँ?" text="यह वापस नहीं हो सकता।" />
    </>
  );
}
