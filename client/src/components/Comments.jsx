import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLive, useSocket } from '../context/SocketContext';
import { Avatar, ConfirmDialog } from './ui';

export default function Comments({ articleId, onCount }) {
  const { user } = useAuth();
  const toast = useToast();
  const socket = useSocket();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async (p = 1) => {
    const r = await api.get(`/comments/article/${articleId}`, { params: { page: p } });
    setItems((prev) => (p === 1 ? r.data.comments : [...prev, ...r.data.comments]));
    setTotal(r.data.total); setPages(r.data.pages); setPage(p);
  }, [articleId]);

  useEffect(() => { load(1).catch(() => {}); }, [load]);

  // Live: join this article's room so other readers' comments appear instantly.
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('article:watch', articleId);
    const rejoin = () => socket.emit('article:watch', articleId);
    socket.on('connect', rejoin);
    return () => { socket.emit('article:unwatch', articleId); socket.off('connect', rejoin); };
  }, [socket, articleId]);

  useLive('comment:new', (p) => {
    if (p.articleId !== articleId) return;
    setItems((l) => (l.some((c) => c._id === p.comment._id) ? l : [p.comment, ...l]));
    setTotal(p.commentsCount); onCount?.(p.commentsCount);
  });
  useLive('comment:removed', (p) => {
    if (p.articleId !== articleId) return;
    setItems((l) => l.filter((c) => c._id !== p.commentId));
    setTotal(p.commentsCount); onCount?.(p.commentsCount);
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(`/comments/article/${articleId}`, { text });
      setItems((l) => (l.some((c) => c._id === r.data.comment._id) ? l : [r.data.comment, ...l]));
      setTotal(r.data.commentsCount); onCount?.(r.data.commentsCount); setText('');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const remove = async () => {
    try { await api.delete(`/comments/${del}`); setItems((l) => l.filter((c) => c._id !== del)); setTotal((t) => t - 1); onCount?.(total - 1); toast.success('कमेंट हटा दिया गया।'); }
    catch (err) { toast.error(errMsg(err)); } finally { setDel(null); }
  };

  return (
    <section aria-label="कमेंट" className="mt-10 border-t border-mist-line pt-8">
      <h2 className="text-2xl font-extrabold">कमेंट <span className="text-ink-faint">({total})</span></h2>
      {user ? (
        <form onSubmit={submit} className="mt-4 flex gap-3">
          <Avatar user={user} />
          <div className="flex-1">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} required minLength={2} placeholder="अपनी राय सभ्य तरीके से लिखिए…" className="input" aria-label="कमेंट लिखें" />
            <div className="mt-2 flex items-center justify-between"><span className="text-xs text-ink-faint">{text.length}/1000</span><button className="btn-primary" disabled={busy || text.trim().length < 2}>{busy ? 'भेज रहे हैं…' : 'कमेंट करें'}</button></div>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-mist p-4 text-sm"><Link to="/login" state={{ from: window.location.pathname }} className="font-bold text-indigo-700">लॉग इन</Link> या <Link to="/register" className="font-bold text-indigo-700">साइन अप</Link> करके बातचीत में शामिल हों।</p>
      )}
      <ul className="mt-6 space-y-5">
        {items.map((c) => (
          <li key={c._id} className="flex gap-3">
            <Avatar user={c.user} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-bold">{c.user?.name}</span>{c.user?.role !== 'reader' && <span className="chip capitalize">{c.user?.role}</span>}<span className="text-xs text-ink-faint">{timeAgo(c.createdAt)}</span></div>
              <p className="mt-0.5 whitespace-pre-line break-words text-[15px]">{c.text}</p>
              {user && (user.role === 'admin' || user._id === c.user?._id) && <button onClick={() => setDel(c._id)} className="mt-1 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-signal-600"><Trash2 size={12} /> हटाएँ</button>}
            </div>
          </li>
        ))}
        {!items.length && <li className="text-sm text-ink-soft">अभी कोई कमेंट नहीं। सबसे पहले आप अपनी राय दीजिए।</li>}
      </ul>
      {page < pages && <button className="btn-outline mt-5" onClick={() => load(page + 1)}>और कमेंट देखें</button>}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title="कमेंट हटाएँ?" text="यह वापस नहीं हो सकता।" confirmLabel="हटाएँ" danger />
    </section>
  );
}
