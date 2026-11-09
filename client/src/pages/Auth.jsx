import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/api';
import { Field } from '../components/ui';
import Seo from '../components/Seo';
import { Logo } from '../components/Layout';

function Shell({ title, sub, children, footer }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Seo title={title} noindex />
      <div className="mb-6 flex justify-center"><Logo /></div>
      <div className="panel p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mb-5 text-sm text-ink-soft">{sub}</p>
        {children}
      </div>
      <p className="mt-4 text-center text-sm text-ink-soft">{footer}</p>
    </div>
  );
}

const useAuthForm = (action, initial) => {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const nav = useNavigate();
  const loc = useLocation();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setFields({});
    try {
      await action(form);
      nav(loc.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      const d = err.response?.data?.details;
      if (d) setFields(Object.fromEntries(d.map((x) => [x.field, x.message])));
    } finally { setBusy(false); }
  };
  return { form, set: (k) => (e) => setForm({ ...form, [k]: e.target.value }), busy, error, fields, submit };
};

export function Login() {
  const { login, user } = useAuth();
  const f = useAuthForm((v) => login(v.email, v.password), { email: '', password: '' });
  const loc = useLocation();
  if (user) return <Navigate to={loc.state?.from || '/dashboard'} replace />;
  return (
    <Shell title="वापसी पर स्वागत है" sub="लाइक, कमेंट, बुकमार्क और अपना पर्सनल फ़ीड पाने के लिए लॉग इन कीजिए।" footer={<>नए हैं? <Link to="/register" className="font-bold text-indigo-700">खाता बनाइए</Link></>}>
      <form onSubmit={f.submit} className="space-y-4" noValidate>
        {f.error && <div role="alert" className="rounded-md bg-signal-500/10 px-3 py-2 text-sm font-semibold text-signal-600">{f.error}</div>}
        <Field label="ईमेल" error={f.fields.email}><input className="input" type="email" autoComplete="email" required value={f.form.email} onChange={f.set('email')} /></Field>
        <Field label="पासवर्ड" error={f.fields.password}><input className="input" type="password" autoComplete="current-password" required value={f.form.password} onChange={f.set('password')} /></Field>
        <button className="btn-primary w-full" disabled={f.busy}>{f.busy ? 'लॉग इन हो रहा है…' : 'लॉग इन'}</button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const f = useAuthForm((v) => register(v), { name: '', email: '', password: '' });
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <Shell title="अपना खाता बनाइए" sub="पाठकों के लिए मुफ़्त। खबरें लिखना चाहते हैं? बाद में प्रोफ़ाइल से रिपोर्टर बनने का अनुरोध भेजिए।" footer={<>पहले से खाता है? <Link to="/login" className="font-bold text-indigo-700">लॉग इन</Link></>}>
      <form onSubmit={f.submit} className="space-y-4" noValidate>
        {f.error && <div role="alert" className="rounded-md bg-signal-500/10 px-3 py-2 text-sm font-semibold text-signal-600">{f.error}</div>}
        <Field label="पूरा नाम" error={f.fields.name}><input className="input" autoComplete="name" required value={f.form.name} onChange={f.set('name')} /></Field>
        <Field label="ईमेल" error={f.fields.email}><input className="input" type="email" autoComplete="email" required value={f.form.email} onChange={f.set('email')} /></Field>
        <Field label="पासवर्ड" error={f.fields.password} hint="कम से कम 8 अक्षर, जिनमें एक अक्षर और एक अंक हो।"><input className="input" type="password" autoComplete="new-password" required value={f.form.password} onChange={f.set('password')} /></Field>
        <button className="btn-primary w-full" disabled={f.busy}>{f.busy ? 'खाता बन रहा है…' : 'साइन अप'}</button>
      </form>
    </Shell>
  );
}
