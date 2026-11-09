import { useState } from 'react';
import { Pencil, Plus, Trash2, Pause, Play } from 'lucide-react';
import { api, errMsg, img } from '../../../lib/api';
import useFetch from '../../../hooks/useFetch';
import { useToast } from '../../../context/ToastContext';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageTitle, Spinner } from '../../../components/ui';

const empty = { title: '', link: 'https://', placement: 'sidebar', startsAt: '', endsAt: '' };
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function Ads() {
  const { data, loading, error, reload } = useFetch('/admin/ads');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const open = (ad) => { setEdit(ad || {}); setFile(null); setForm(ad ? { title: ad.title, link: ad.link, placement: ad.placement, startsAt: day(ad.startsAt), endsAt: day(ad.endsAt) } : empty); };
  const save = async () => {
    setBusy(true);
    const fd = new FormData(); Object.entries(form).forEach(([k, v]) => fd.append(k, v)); if (file) fd.append('image', file);
    try { if (edit._id) await api.put(`/admin/ads/${edit._id}`, fd); else await api.post('/admin/ads', fd); toast.success('विज्ञापन सेव हो गया।'); setEdit(null); reload({ silent: true }); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const toggle = async (a) => { try { await api.put(`/admin/ads/${a._id}/toggle`); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } };
  const remove = async () => { try { await api.delete(`/admin/ads/${del._id}`); toast.success('विज्ञापन हटा दिया गया।'); reload({ silent: true }); } catch (e) { toast.error(errMsg(e)); } finally { setDel(null); } };

  return (
    <>
      <PageTitle title="विज्ञापन" sub="साइडबार, खबरों के बीच और हेडर/फ़ुटर में दिखने वाले बैनर।" actions={<button className="btn-primary" onClick={() => open()}><Plus size={16} /> नया विज्ञापन</button>} />
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.ads.length && <EmptyState title="अभी कोई विज्ञापन नहीं" text="बैनर अपलोड कीजिए और चुनिए कि वह कहाँ दिखे।" />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data?.ads.map((a) => (
        <div key={a._id} className="panel overflow-hidden">
          <img src={img(a.image)} alt={a.title} className="aspect-[16/9] w-full bg-mist object-cover" />
          <div className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold">{a.title}</h3><Badge value={a.isActive ? 'active' : 'paused'} /></div>
            <p className="mt-1 truncate text-xs text-ink-faint">{a.link}</p>
            <p className="mt-2 text-xs"><b className="capitalize">{a.placement}</b> · {a.impressions} व्यू · {a.clicks} क्लिक{a.impressions ? ` (${((a.clicks / a.impressions) * 100).toFixed(1)}% CTR)` : ''}</p>
            <div className="mt-3 flex gap-1"><button className="btn-outline btn-sm" onClick={() => toggle(a)}>{a.isActive ? <><Pause size={13} /> रोकें</> : <><Play size={13} /> फिर चालू करें</>}</button><button className="btn-outline btn-sm" onClick={() => open(a)}><Pencil size={13} /> बदलें</button><button className="btn-ghost btn-sm ml-auto text-signal-600" onClick={() => setDel(a)} aria-label="विज्ञापन हटाएँ"><Trash2 size={14} /></button></div></div>
        </div>))}</div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'विज्ञापन बदलें' : 'नया विज्ञापन'} footer={<><button className="btn-outline" onClick={() => setEdit(null)}>रद्द करें</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'सेव हो रहा है…' : 'सेव करें'}</button></>}>
        <div className="space-y-3">
          <Field label="शीर्षक"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} /></Field>
          <Field label="लिंक (कहाँ जाएगा)"><input className="input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
          <Field label="जगह"><select className="input" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}><option value="sidebar">साइडबार</option><option value="inline">खबर के बीच में</option><option value="header">हेडर</option><option value="footer">फ़ुटर</option></select></Field>
          <Field label={edit?._id ? 'फ़ोटो बदलें (वैकल्पिक)' : 'बैनर फ़ोटो'}><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="शुरू (वैकल्पिक)"><input type="date" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field><Field label="खत्म (वैकल्पिक)"><input type="date" className="input" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} danger confirmLabel="हटाएँ" title="विज्ञापन हटाएँ?" text={`“${del?.title}” तुरंत दिखना बंद हो जाएगा।`} />
    </>
  );
}
