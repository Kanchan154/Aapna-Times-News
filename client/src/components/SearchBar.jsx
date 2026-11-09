import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../lib/api';

export default function SearchBar({ autoFocus, onDone, className = '' }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const box = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return undefined; }
    const t = setTimeout(() => api.get('/articles/suggest', { params: { q } }).then((r) => setList(r.data.suggestions)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
    onDone?.();
  };

  return (
    <form onSubmit={go} role="search" ref={box} className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input autoFocus={autoFocus} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="खबरें खोजें…" aria-label="खबरें खोजें" className="input pl-9" />
      {open && list.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-mist-line bg-white shadow-lg">
          {list.map((s) => (
            <li key={s._id}><button type="button" className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-mist"
              onClick={() => { setOpen(false); setQ(''); nav(`/article/${s.slug}`); onDone?.(); }}>{s.title}</button></li>
          ))}
        </ul>
      )}
    </form>
  );
}
