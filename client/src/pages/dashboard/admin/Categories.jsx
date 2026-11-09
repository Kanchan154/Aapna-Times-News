import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errMsg } from '../../../lib/api';
import { useCategories } from '../../../hooks/useCategories';
import { useToast } from '../../../context/ToastContext';
import { ConfirmDialog, Field, Modal, PageTitle } from '../../../components/ui';

const empty = { name: '', nameHi: '', description: '', color: '#111111', order: 0 };

export default function Categories() {
  const { categories, reload } = useCategories();
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const open = (c) => { setEdit(c || {}); setForm(c ? { name: c.name, nameHi: c.nameHi || '', description: c.description || '', color: c.color, order: c.order } : empty); };
  const save = async () => {
    setBusy(true);
    try {
      if (edit._id) await api.put(`/categories/${edit._id}`, form); else await api.post('/categories', form);
      toast.success('श्रेणी सेव हो गई।'); setEdit(null); reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => { try { await api.delete(`/categories/${del._id}`); toast.success('श्रेणी हटा दी गई।'); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setDel(null); } };

  return (
    <>
      <PageTitle title="श्रेणियाँ" sub="साइट के मेनू में दिखने वाले सेक्शन।" actions={<button className="btn-primary" onClick={() => open()}><Plus size={16} /> श्रेणी जोड़ें</button>} />
      <div className="panel overflow-x-auto"><table className="w-full min-w-[560px]">
        <thead className="border-b border-mist-line bg-mist/60"><tr><th className="table-th">नाम</th><th className="table-th">हिंदी</th><th className="table-th">क्रम</th><th className="table-th">खबरें</th><th className="table-th text-right">कार्रवाई</th></tr></thead>
        <tbody>{categories.map((c) => (
          <tr key={c._id} className="border-b border-mist-line last:border-0">
            <td className="table-td"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: c.color }} /><b>{c.nameHi || c.name}</b><div className="text-xs text-ink-faint">{c.name} · /{c.slug}</div></td>
            <td className="table-td">{c.nameHi}</td><td className="table-td">{c.order}</td><td className="table-td">{c.articleCount}</td>
            <td className="table-td"><div className="flex justify-end gap-1"><button className="btn-ghost btn-sm" onClick={() => open(c)} aria-label={`${c.name} बदलें`}><Pencil size={14} /></button><button className="btn-ghost btn-sm text-signal-600" onClick={() => setDel(c)} aria-label={`${c.name} हटाएँ`}><Trash2 size={14} /></button></div></td>
          </tr>))}</tbody></table></div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'श्रेणी बदलिए' : 'नई श्रेणी'} footer={<><button className="btn-outline" onClick={() => setEdit(null)}>रद्द करें</button><button className="btn-primary" onClick={save} disabled={busy || form.name.trim().length < 2}>{busy ? 'सेव हो रहा है…' : 'सेव करें'}</button></>}>
        <div className="space-y-3">
          <Field label="नाम"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={40} /></Field>
          <Field label="हिंदी नाम"><input className="input" value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} maxLength={40} /></Field>
          <Field label="विवरण"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="रंग"><input type="color" className="h-10 w-full rounded border border-mist-line" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field><Field label="मेनू क्रम"><input type="number" min="0" className="input" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} danger confirmLabel="हटाएँ" title={`“${del?.name}” हटाएँ?`} text="जिस श्रेणी में खबरें हैं, उसे हटाया नहीं जा सकता।" />
    </>
  );
}
