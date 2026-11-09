import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import { Avatar, Badge, Field, PageTitle } from '../../components/ui';
import { catName } from '../../lib/format';

export default function Profile() {
  const { user, setUser, refreshToken } = useAuth();
  const { categories } = useCategories();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '', city: user.city || '', interests: user.interests || [] });
  const [pw, setPw] = useState({ currentPassword: '', password: '' });
  const [busy, setBusy] = useState('');
  const file = useRef(null);

  const toggle = (id) => setForm((f) => ({ ...f, interests: f.interests.includes(id) ? f.interests.filter((i) => i !== id) : [...f.interests, id] }));

  const save = async (e) => {
    e.preventDefault(); setBusy('save');
    try { const r = await api.put('/auth/me', form); setUser(r.data.user); toast.success('प्रोफ़ाइल सेव हो गई।'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };
  const upload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('avatar', f); setBusy('avatar');
    try { const r = await api.post('/auth/me/avatar', fd); setUser(r.data.user); toast.success('फ़ोटो बदल गई।'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); e.target.value = ''; }
  };
  const changePw = async (e) => {
    e.preventDefault(); setBusy('pw');
    try { const r = await api.put('/auth/me/password', pw); refreshToken(r.data.token); setPw({ currentPassword: '', password: '' }); toast.success('Password changed.'); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };
  const request = async () => {
    setBusy('req');
    try { const r = await api.post('/auth/me/request-reporter'); setUser(r.data.user); toast.success(r.data.message); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  return (
    <>
      <PageTitle title="प्रोफ़ाइल" sub="अपनी जानकारी और पसंदीदा सेक्शन यहाँ बदलिए।" />
      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={save} className="panel space-y-5 p-5 xl:col-span-2">
          <div className="flex items-center gap-4">
            <div className="relative"><Avatar user={user} size={72} />
              <button type="button" onClick={() => file.current.click()} className="absolute -bottom-1 -right-1 rounded-full bg-indigo-700 p-1.5 text-white" aria-label="फ़ोटो बदलें" disabled={busy === 'avatar'}><Camera size={14} /></button>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
            </div>
            <div><div className="font-bold">{user.email}</div><Badge value={user.role} /></div>
          </div>
          <Field label="पूरा नाम"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="शहर" hint="आपके डिफ़ॉल्ट मौसम के लिए।"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={60} /></Field>
            <Field label="आपके बारे में"><input className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={400} /></Field>
          </div>
          <Field label="मेरे पसंदीदा सेक्शन" hint="आपके “आपके लिए” फ़ीड में इन्हीं सेक्शन की खबरें दिखेंगी।">
            <div className="flex flex-wrap gap-2">{categories.map((c) => {
              const on = form.interests.includes(c._id);
              return <button type="button" key={c._id} onClick={() => toggle(c._id)} aria-pressed={on} className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? 'border-transparent text-white' : 'border-mist-line text-ink-soft hover:bg-mist'}`} style={on ? { background: c.color } : undefined}>{catName(c)}</button>;
            })}</div>
          </Field>
          <button className="btn-primary" disabled={busy === 'save'}>{busy === 'save' ? 'सेव हो रहा है…' : 'बदलाव सेव करें'}</button>
        </form>

        <div className="space-y-6">
          <form onSubmit={changePw} className="panel space-y-3 p-5">
            <h2 className="font-bold">पासवर्ड बदलें</h2>
            <input className="input" type="password" placeholder="मौजूदा पासवर्ड" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
            <input className="input" type="password" placeholder="नया पासवर्ड (8+ अक्षर, एक अंक ज़रूरी)" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required minLength={8} />
            <button className="btn-outline" disabled={busy === 'pw'}>पासवर्ड अपडेट करें</button>
          </form>
          {user.role === 'reader' && (
            <section className="panel p-5">
              <h2 className="font-bold">रिपोर्टर बनिए</h2>
              <p className="mt-1 text-sm text-ink-soft">अपना टाइम्स न्यूज़ के लिए खबरें लिखिए। हर अनुरोध को एडमिन देखता है।</p>
              {user.reporterRequest === 'pending' ? <p className="mt-3 rounded bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">अनुरोध जाँच के इंतज़ार में है</p>
                : <button className="btn-accent mt-3" onClick={request} disabled={busy === 'req'}>{user.reporterRequest === 'rejected' ? 'फिर से अनुरोध करें' : 'रिपोर्टर बनने का अनुरोध करें'}</button>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
