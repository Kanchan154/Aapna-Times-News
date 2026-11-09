import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { api, errMsg } from '../../../lib/api';
import useFetch from '../../../hooks/useFetch';
import { useToast } from '../../../context/ToastContext';
import { fmtDate } from '../../../lib/format';
import { Badge, EmptyState, ErrorState, PageTitle, Pagination, Spinner } from '../../../components/ui';

export default function Subscribers() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/admin/subscribers', { params: { page } });
  const toast = useToast();
  const remove = async (s) => { try { await api.delete(`/admin/subscribers/${s._id}`); toast.success('सब्सक्राइबर हटा दिया गया।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } };
  const exportCsv = async () => {
    try {
      const rows = []; let p = 1; let pages = 1;
      do { const r = await api.get('/admin/subscribers', { params: { page: p } }); rows.push(...r.data.subscribers); pages = r.data.pages; p += 1; } while (p <= pages);
      const csv = ['email,status,subscribed_on', ...rows.map((s) => `${s.email},${s.isActive ? 'active' : 'unsubscribed'},${s.createdAt}`)].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'subscribers.csv'; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      <PageTitle title="न्यूज़लेटर सब्सक्राइबर" sub={data ? `${data.total} लोग जुड़ चुके हैं।` : ''} actions={<button className="btn-outline" onClick={exportCsv}><Download size={15} /> CSV निकालें</button>} />
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.subscribers.length && <EmptyState title="अभी कोई सब्सक्राइबर नहीं" />}
      {data?.subscribers.length > 0 && <div className="panel overflow-x-auto"><table className="w-full min-w-[480px]"><thead className="border-b border-mist-line bg-mist/60"><tr><th className="table-th">ईमेल</th><th className="table-th">स्थिति</th><th className="table-th">जुड़े</th><th className="table-th" /></tr></thead>
        <tbody>{data.subscribers.map((s) => <tr key={s._id} className="border-b border-mist-line last:border-0"><td className="table-td">{s.email}</td><td className="table-td"><Badge value={s.isActive ? 'active' : 'inactive'} label={s.isActive ? 'active' : 'unsubscribed'} /></td><td className="table-td text-xs text-ink-faint">{fmtDate(s.createdAt)}</td><td className="table-td text-right"><button className="btn-ghost btn-sm text-signal-600" onClick={() => remove(s)} aria-label={`${s.email} हटाएँ`}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </>
  );
}
