import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Eye, Pencil, Trash2, Star, Zap, EyeOff } from 'lucide-react';
import { api, errMsg } from '../../../lib/api';
import useFetch from '../../../hooks/useFetch';
import { useToast } from '../../../context/ToastContext';
import { useLive } from '../../../context/SocketContext';
import { fmtDateTime, catName } from '../../../lib/format';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Modal, PageTitle, Pagination, Spinner } from '../../../components/ui';

const TABS = [['pending', 'समीक्षा के इंतज़ार में'], ['', 'सभी'], ['published', 'पब्लिश'], ['draft', 'ड्राफ़्ट'], ['rejected', 'अस्वीकृत']];

export default function Review() {
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/admin/articles', { params: { status: status || undefined, q: q || undefined, page } });
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [del, setDel] = useState(null);
  const toast = useToast();
  useLive('article:pending', () => reload({ silent: true }));

  const call = async (fn, ok) => { try { await fn(); toast.success(ok); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } };
  const approve = (a) => call(() => api.post(`/admin/articles/${a._id}/approve`), 'पब्लिश हो गई।');
  const unpublish = (a) => call(() => api.post(`/admin/articles/${a._id}/unpublish`), 'ड्राफ़्ट में वापस भेज दी गई।');
  const flag = (a, k) => call(() => api.put(`/admin/articles/${a._id}/flags`, { [k]: !a[k] }), 'अपडेट हो गया।');
  const doReject = async () => { await call(() => api.post(`/admin/articles/${reject._id}/reject`, { reason }), 'रिपोर्टर को वापस भेज दी गई।'); setReject(null); setReason(''); };
  const doDelete = async () => { await call(() => api.delete(`/reporter/articles/${del._id}`), 'खबर हटा दी गई।'); setDel(null); };

  return (
    <>
      <PageTitle title="खबरें और समीक्षा" sub="रिपोर्टर की खबरें मंज़ूर कीजिए, फ़ीचर कीजिए या सुझाव के साथ लौटाइए।" actions={<Link to="/dashboard/articles/new" className="btn-primary">खबर लिखें</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([v, l]) => <button key={l} onClick={() => { setStatus(v); setPage(1); }} aria-pressed={status === v} className={`rounded-full px-3 py-1 text-sm font-semibold ${status === v ? 'bg-indigo-700 text-white' : 'bg-white text-ink-soft ring-1 ring-mist-line'}`}>{l}</button>)}
        <input className="input ml-auto w-full max-w-xs" placeholder="हेडलाइन खोजें…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="खबरें खोजें" />
      </div>
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.articles.length && <EmptyState title={status === 'pending' ? 'समीक्षा की कतार खाली है' : 'कोई खबर नहीं मिली'} text={status === 'pending' ? 'रिपोर्टर की नई खबरें यहाँ तुरंत दिखेंगी।' : undefined} />}
      {data?.articles.length > 0 && (
        <div className="panel overflow-x-auto"><table className="w-full min-w-[760px]">
          <thead className="border-b border-mist-line bg-mist/60"><tr><th className="table-th">खबर</th><th className="table-th">लेखक</th><th className="table-th">स्थिति</th><th className="table-th">अपडेट</th><th className="table-th text-right">कार्रवाई</th></tr></thead>
          <tbody>{data.articles.map((a) => (
            <tr key={a._id} className="border-b border-mist-line last:border-0">
              <td className="table-td max-w-xs"><div className="line-clamp-2 font-semibold">{a.title}</div><div className="text-xs text-ink-faint">{catName(a.category)}{a.isFeatured && ' · फ़ीचर्ड'}{a.isBreaking && ' · ब्रेकिंग'}</div></td>
              <td className="table-td text-sm">{a.author?.name}</td>
              <td className="table-td"><Badge value={a.status} /></td>
              <td className="table-td whitespace-nowrap text-xs text-ink-faint">{fmtDateTime(a.updatedAt)}</td>
              <td className="table-td"><div className="flex flex-wrap justify-end gap-1">
                <Link to={`/article/${a.slug}`} className="btn-ghost btn-sm" title="प्रीव्यू"><Eye size={14} /></Link>
                <Link to={`/dashboard/articles/${a._id}/edit`} className="btn-ghost btn-sm" title="बदलें"><Pencil size={14} /></Link>
                {a.status !== 'published' && <button className="btn-sm btn bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => approve(a)}><Check size={14} /> {a.status === 'pending' ? 'मंज़ूर करें' : 'पब्लिश करें'}</button>}
                {a.status === 'pending' && <button className="btn-outline btn-sm" onClick={() => setReject(a)}><X size={14} /> अस्वीकार करें</button>}
                {a.status === 'published' && <>
                  <button className={`btn-sm btn ${a.isFeatured ? 'bg-marigold-500' : 'btn-outline'}`} title="फ़ीचर्ड चालू/बंद" onClick={() => flag(a, 'isFeatured')}><Star size={14} /></button>
                  <button className={`btn-sm btn ${a.isBreaking ? 'bg-signal-500 text-white' : 'btn-outline'}`} title="ब्रेकिंग चालू/बंद" onClick={() => flag(a, 'isBreaking')}><Zap size={14} /></button>
                  <button className="btn-outline btn-sm" title="पब्लिश हटाएँ" onClick={() => unpublish(a)}><EyeOff size={14} /></button></>}
                <button className="btn-ghost btn-sm text-signal-600" title="हटाएँ" onClick={() => setDel(a)}><Trash2 size={14} /></button>
              </div></td>
            </tr>))}</tbody></table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
      <Modal open={!!reject} onClose={() => setReject(null)} title="रिपोर्टर को वापस भेजें" footer={<><button className="btn-outline" onClick={() => setReject(null)}>रद्द करें</button><button className="btn-danger" disabled={reason.trim().length < 5} onClick={doReject}>सुझाव के साथ अस्वीकार करें</button></>}>
        <p className="mb-2 text-sm text-ink-soft">“{reject?.title}”</p>
        <textarea className="input" rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="बताइए क्या बदलना है (कम से कम 5 अक्षर)" aria-label="कारण" />
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} danger confirmLabel="हटाएँ" title="खबर हटाएँ?" text={`“${del?.title}”, उसकी फ़ोटो और कमेंट हमेशा के लिए हट जाएँगे।`} />
    </>
  );
}
