import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { catName } from '../../lib/format';
import { Newspaper, ImagePlus, Lock } from 'lucide-react';
import { api, errMsg, img } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import RichEditor from '../../components/RichEditor';
import { ErrorState, Field, PageTitle, Spinner, Badge } from '../../components/ui';

const blank = { title: '', summary: '', content: '', category: '', tags: '', imageCaption: '', seoTitle: '', seoDescription: '', isFeatured: false, isBreaking: false };

export default function ArticleEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { categories } = useCategories();
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [orig, setOrig] = useState(null);
  const [cover, setCover] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [errs, setErrs] = useState({});
  const [leads, setLeads] = useState(null);
  const [leadErr, setLeadErr] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/reporter/articles/${id}`).then((r) => {
      const a = r.data.article; setOrig(a);
      setForm({ title: a.title, summary: a.summary, content: a.content, category: a.category, tags: (a.tags || []).join(', '), imageCaption: a.imageCaption || '', seoTitle: a.seoTitle || '', seoDescription: a.seoDescription || '', isFeatured: a.isFeatured, isBreaking: a.isBreaking });
      setPreview(img(a.coverImage));
    }).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => { setErrs((x) => ({ ...x, [k]: undefined })); setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); };
  const pick = (e) => { const f = e.target.files?.[0]; if (f) { setCover(f); setPreview(URL.createObjectURL(f)); } };

  const loadLeads = async () => {
    setLeadErr(''); setLeads([]);
    try { const r = await api.get('/external/headlines', { params: { category: 'general' } }); setLeads(r.data.articles); }
    catch (e) { setLeadErr(errMsg(e)); setLeads(null); }
  };
  const applyLead = (l) => { setForm((f) => ({ ...f, title: l.title?.replace(/ - [^-]+$/, '') || '', summary: (l.summary || '').slice(0, 400) })); toast.info('हेडलाइन कॉपी हो गई। खबर अपने शब्दों में लिखिए।'); };

  const send = async (submit) => {
    setBusy(submit ? 'submit' : 'draft'); setErrs({});
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.set('submit', submit ? 'true' : 'false');
    if (cover) fd.append('coverImage', cover);
    try {
      if (id) await api.put(`/reporter/articles/${id}`, fd); else await api.post('/reporter/articles', fd);
      toast.success(!submit ? 'ड्राफ़्ट सेव हो गया।' : isAdmin ? 'पब्लिश हो गई।' : 'मंज़ूरी के लिए भेज दी गई। नतीजे की सूचना आपको मिलेगी।');
      nav(isAdmin ? '/dashboard/review' : '/dashboard/articles');
    } catch (e) {
      toast.error(errMsg(e));
      const d = e.response?.data?.details; if (d) setErrs(Object.fromEntries(d.map((x) => [x.field, x.message])));
    } finally { setBusy(''); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  const locked = orig && orig.status === 'published' && !isAdmin;
  if (locked) return (
    <div className="panel p-8 text-center"><Lock className="mx-auto text-ink-faint" /><h1 className="mt-2 text-xl font-bold">यह खबर पब्लिश हो चुकी है</h1><p className="mt-1 text-sm text-ink-soft">पब्लिश खबर सिर्फ़ एडमिन बदल सकता है। बदलाव चाहिए तो एडमिन से पब्लिश हटवाइए।</p><Link to="/dashboard/articles" className="btn-outline mt-4">मेरी खबरों पर लौटें</Link></div>
  );

  return (
    <>
      <PageTitle title={id ? 'खबर बदलिए' : 'खबर लिखें'} sub={isAdmin ? 'एडमिन के रूप में “अभी पब्लिश करें” दबाते ही खबर लाइव हो जाती है।' : 'रिपोर्टर की खबर एडमिन की मंज़ूरी के बाद ही लाइव होती है।'} actions={orig && <Badge value={orig.status} />} />
      {orig?.status === 'rejected' && orig.rejectionReason && <div className="mb-4 rounded-md border border-signal-500/30 bg-signal-500/5 p-4 text-sm"><b className="text-signal-600">संपादक की टिप्पणी:</b> {orig.rejectionReason}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="panel space-y-4 p-5">
            <Field label="हेडलाइन" error={errs.title}><input className="input text-lg font-semibold" value={form.title} onChange={set('title')} maxLength={220} placeholder="साफ़ और सटीक हेडलाइन" /></Field>
            <Field label="सार" error={errs.summary} hint={`${form.summary.length}/400 — कार्ड और सर्च नतीजों में दिखता है।`}><textarea className="input" rows={2} maxLength={400} value={form.summary} onChange={set('summary')} /></Field>
            <Field label="खबर" error={errs.content}><RichEditor key={id || 'new'} initial={form.content} onChange={(html) => { setErrs((x) => (x.content ? { ...x, content: undefined } : x)); setForm((f) => ({ ...f, content: html })); }} /></Field>
          </div>
          <div className="panel space-y-4 p-5">
            <h2 className="font-bold">सर्च इंजन की जानकारी <span className="text-sm font-normal text-ink-faint">(वैकल्पिक)</span></h2>
            <Field label="SEO शीर्षक" hint={`${form.seoTitle.length}/70`}><input className="input" maxLength={70} value={form.seoTitle} onChange={set('seoTitle')} placeholder="खाली छोड़ने पर हेडलाइन लगेगी" /></Field>
            <Field label="SEO विवरण" hint={`${form.seoDescription.length}/170`}><textarea className="input" rows={2} maxLength={170} value={form.seoDescription} onChange={set('seoDescription')} placeholder="खाली छोड़ने पर सार लगेगा" /></Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel space-y-4 p-5">
            <Field label="श्रेणी" error={errs.category}><select className="input" value={form.category} onChange={set('category')}><option value="">चुनिए…</option>{categories.map((c) => <option key={c._id} value={c._id}>{catName(c)}</option>)}</select></Field>
            <Field label="टैग" hint="कॉमा से अलग कीजिए।"><input className="input" value={form.tags} onChange={set('tags')} placeholder="क्रिकेट, सीरीज़" /></Field>
            <Field label="कवर फ़ोटो" hint="JPG, PNG या WEBP, 3 MB तक।">
              {preview ? <img src={preview} alt="कवर प्रीव्यू" className="mb-2 aspect-video w-full rounded-md object-cover" /> : <div className="mb-2 flex aspect-video items-center justify-center rounded-md bg-mist text-ink-faint"><ImagePlus /></div>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-semibold file:text-indigo-700" />
            </Field>
            <Field label="फ़ोटो कैप्शन"><input className="input" value={form.imageCaption} onChange={set('imageCaption')} maxLength={160} /></Field>
            {isAdmin && (
              <fieldset className="space-y-2 rounded-md bg-mist p-3 text-sm"><legend className="px-1 text-xs font-bold text-ink-soft">एडमिन विकल्प</legend>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> होमपेज पर फ़ीचर्ड</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isBreaking} onChange={set('isBreaking')} /> ब्रेकिंग न्यूज़ (टिकर + लाइव अलर्ट)</label>
              </fieldset>
            )}
            <div className="flex flex-col gap-2 pt-1">
              <button className="btn-primary" disabled={!!busy} onClick={() => send(true)}>{busy === 'submit' ? 'भेज रहे हैं…' : isAdmin ? 'अभी पब्लिश करें' : 'मंज़ूरी के लिए भेजें'}</button>
              <button className="btn-outline" disabled={!!busy} onClick={() => send(false)}>{busy === 'draft' ? 'सेव हो रहा है…' : 'ड्राफ़्ट में सेव करें'}</button>
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="flex items-center gap-2 font-bold"><Newspaper size={16} /> खबरों के सुराग</h2>
            <p className="mt-1 text-xs text-ink-soft">वैकल्पिक: आइडिया के लिए NewsAPI से आज की सुर्खियाँ लाइए। हमेशा अपने शब्दों में लिखिए और तथ्य जाँचिए।</p>
            {leads === null && <button className="btn-outline btn-sm mt-3" onClick={loadLeads}>सुर्खियाँ लाइए</button>}
            {leadErr && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-900">{leadErr}</p>}
            {leads?.length > 0 && <ul className="mt-3 max-h-64 space-y-1 overflow-auto">{leads.map((l, i) => <li key={i}><button type="button" onClick={() => applyLead(l)} className="w-full rounded p-2 text-left text-xs hover:bg-mist"><b>{l.title}</b><span className="block text-ink-faint">{l.source}</span></button></li>)}</ul>}
          </div>
        </div>
      </div>
    </>
  );
}
