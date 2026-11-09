import { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { api, errMsg } from '../../../lib/api';
import useFetch from '../../../hooks/useFetch';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { fmtDate } from '../../../lib/format';
import { Avatar, Badge, ConfirmDialog, EmptyState, ErrorState, PageTitle, Pagination, Spinner } from '../../../components/ui';

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [requests, setRequests] = useState(false);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/admin/users', { params: { q: q || undefined, role: role || undefined, requests: requests || undefined, page } });
  const [del, setDel] = useState(null);
  const toast = useToast();

  const update = async (u, patch, msg = 'यूज़र अपडेट हो गया।') => { try { await api.put(`/admin/users/${u._id}`, patch); toast.success(msg); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } };
  const remove = async () => { try { await api.delete(`/admin/users/${del._id}`); toast.success('यूज़र हटा दिया गया।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } finally { setDel(null); } };

  return (
    <>
      <PageTitle title="यूज़र" sub="रोल बदलिए, रिपोर्टर के अनुरोध मंज़ूर कीजिए या खाते बंद कीजिए।" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="नाम या ईमेल खोजें…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="यूज़र खोजें" />
        <select className="input w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="रोल से छाँटें"><option value="">सभी रोल</option><option value="reader">पाठक</option><option value="reporter">रिपोर्टर</option><option value="admin">एडमिन</option></select>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={requests} onChange={(e) => { setRequests(e.target.checked); setPage(1); }} /> सिर्फ़ रिपोर्टर अनुरोध</label>
      </div>
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.users.length && <EmptyState title="कोई यूज़र नहीं मिला" />}
      {data?.users.length > 0 && (
        <div className="panel overflow-x-auto"><table className="w-full min-w-[720px]">
          <thead className="border-b border-mist-line bg-mist/60"><tr><th className="table-th">यूज़र</th><th className="table-th">रोल</th><th className="table-th">स्थिति</th><th className="table-th">जुड़े</th><th className="table-th text-right">कार्रवाई</th></tr></thead>
          <tbody>{data.users.map((u) => {
            const self = u._id === me._id;
            return (
              <tr key={u._id} className="border-b border-mist-line last:border-0">
                <td className="table-td"><div className="flex items-center gap-3"><Avatar user={u} size={34} /><div className="min-w-0"><div className="truncate font-semibold">{u.name}{self && ' (आप)'}</div><div className="truncate text-xs text-ink-faint">{u.email}</div></div></div></td>
                <td className="table-td">
                  <select className="input w-32 py-1" value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value }, `रोल बदलकर ${e.target.value} हो गया।`)} aria-label={`${u.name} का रोल`}><option value="reader">पाठक</option><option value="reporter">रिपोर्टर</option><option value="admin">एडमिन</option></select>
                  {u.reporterRequest === 'pending' && <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-800">Wants reporter access
                    <button className="rounded bg-emerald-600 p-0.5 text-white" title="मंज़ूर करें" onClick={() => update(u, { role: 'reporter' }, 'रिपोर्टर बना दिया गया।')}><Check size={12} /></button>
                    <button className="rounded bg-signal-500 p-0.5 text-white" title="अस्वीकार" onClick={() => update(u, { reporterRequest: 'rejected' }, 'अनुरोध अस्वीकार किया गया।')}><X size={12} /></button></div>}
                </td>
                <td className="table-td"><Badge value={u.isActive ? 'active' : 'inactive'} /></td>
                <td className="table-td whitespace-nowrap text-xs text-ink-faint">{fmtDate(u.createdAt)}</td>
                <td className="table-td"><div className="flex justify-end gap-1">
                  <button className="btn-outline btn-sm" disabled={self} onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? 'खाता बंद कर दिया गया।' : 'खाता फिर चालू कर दिया गया।')}>{u.isActive ? 'बंद करें' : 'चालू करें'}</button>
                  <button className="btn-ghost btn-sm text-signal-600" disabled={self} title="हटाएँ" onClick={() => setDel(u)}><Trash2 size={14} /></button>
                </div></td>
              </tr>);
          })}</tbody></table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} danger confirmLabel="यूज़र हटाएँ" title="यह यूज़र हटाएँ?" text={`${del?.name} और उनके कमेंट हट जाएँगे। जिन यूज़र ने खबरें लिखी हैं, उन्हें हटाने की जगह बंद कीजिए।`} />
    </>
  );
}
