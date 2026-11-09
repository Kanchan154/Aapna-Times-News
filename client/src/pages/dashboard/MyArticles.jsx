import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Send, Trash2, Eye } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import useFetch from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { fmtDateTime, catName } from '../../lib/format';
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageTitle, Pagination, Spinner } from '../../components/ui';

const TABS = ['', 'draft', 'pending', 'published', 'rejected'];

export default function MyArticles() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/reporter/articles', { params: { status: status || undefined, page } });
  const [del, setDel] = useState(null);
  const toast = useToast();

  const submit = async (a) => {
    try { await api.post(`/reporter/articles/${a._id}/submit`); toast.success('मंज़ूरी के लिए भेज दी गई।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async () => {
    try { await api.delete(`/reporter/articles/${del._id}`); toast.success('खबर हटा दी गई।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } finally { setDel(null); }
  };

  return (
    <>
      <PageTitle title="मेरी खबरें" actions={<Link to="/dashboard/articles/new" className="btn-primary">खबर लिखें</Link>} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={status === t} onClick={() => { setStatus(t); setPage(1); }} className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${status === t ? 'bg-indigo-700 text-white' : 'bg-white text-ink-soft ring-1 ring-mist-line'}`}>{t || 'सभी'}</button>)}
      </div>
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.articles.length && <EmptyState title="यहाँ कोई खबर नहीं" text="आप जैसे-जैसे खबरें लिखेंगे, वे यहाँ दिखेंगी।" action={<Link to="/dashboard/articles/new" className="btn-primary">अपनी पहली खबर लिखिए</Link>} />}
      {data?.articles.length > 0 && (
        <div className="panel overflow-x-auto"><table className="w-full min-w-[640px]">
          <thead className="border-b border-mist-line bg-mist/60"><tr><th className="table-th">खबर</th><th className="table-th">स्थिति</th><th className="table-th">अपडेट</th><th className="table-th text-right">कार्रवाई</th></tr></thead>
          <tbody>{data.articles.map((a) => (
            <tr key={a._id} className="border-b border-mist-line last:border-0">
              <td className="table-td max-w-sm"><div className="line-clamp-2 font-semibold">{a.title}</div><div className="text-xs text-ink-faint">{catName(a.category)}{a.status === 'published' && ` · ${a.views} व्यू`}</div>{a.status === 'rejected' && a.rejectionReason && <div className="mt-1 text-xs text-signal-600">संपादक की टिप्पणी: {a.rejectionReason}</div>}</td>
              <td className="table-td"><Badge value={a.status} /></td>
              <td className="table-td whitespace-nowrap text-xs text-ink-faint">{fmtDateTime(a.updatedAt)}</td>
              <td className="table-td"><div className="flex justify-end gap-1">
                <Link to={`/article/${a.slug}`} className="btn-ghost btn-sm" title="देखें / प्रीव्यू"><Eye size={14} /></Link>
                {a.status !== 'published' && <Link to={`/dashboard/articles/${a._id}/edit`} className="btn-ghost btn-sm" title="बदलें"><Pencil size={14} /></Link>}
                {(a.status === 'draft' || a.status === 'rejected') && <button className="btn-ghost btn-sm text-indigo-700" title="मंज़ूरी के लिए भेजें" onClick={() => submit(a)}><Send size={14} /></button>}
                {a.status !== 'published' && <button className="btn-ghost btn-sm text-signal-600" title="हटाएँ" onClick={() => setDel(a)}><Trash2 size={14} /></button>}
              </div></td>
            </tr>))}</tbody></table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} danger confirmLabel="हटाएँ" title="यह खबर हटाएँ?" text={`“${del?.title}” और उसके कमेंट हमेशा के लिए हट जाएँगे।`} />
    </>
  );
}
