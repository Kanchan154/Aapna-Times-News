import { useState } from 'react';
import { Mail } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function NewsletterBox({ compact }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api.post('/newsletter/subscribe', { email }); toast.success(r.data.message); setEmail(''); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <section className={`rounded-lg bg-indigo-700 text-white ${compact ? 'p-4' : 'p-5'}`} aria-label="न्यूज़लेटर">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><Mail size={18} className="text-marigold-500" /> रोज़ की डाइजेस्ट</h2>
      <p className="mt-1 text-sm text-indigo-100">दिन की बड़ी खबरें एक ही ईमेल में। कोई स्पैम नहीं।</p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aap@example.com" aria-label="ईमेल पता" className="input min-w-0 flex-1 border-transparent" />
        <button className="btn-accent" disabled={busy}>{busy ? '…' : 'सब्सक्राइब करें'}</button>
      </form>
    </section>
  );
}
