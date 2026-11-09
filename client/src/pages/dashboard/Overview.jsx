import { Link } from 'react-router-dom';
import { Eye, Heart, FileText, Users, MessageSquare, Mail, Clock, Bookmark, PenSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import { compact } from '../../lib/format';
import { ErrorState, PageTitle, Spinner, Badge } from '../../components/ui';

export const Stat = ({ icon: Icon, label, value, tone = 'text-indigo-700', to }) => {
  const body = (
    <div className="panel flex items-center gap-4 p-4 hover:border-indigo-200">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg bg-mist ${tone}`}><Icon size={20} /></span>
      <div><div className="font-display text-2xl font-extrabold leading-none">{value}</div><div className="mt-1 text-xs font-semibold text-ink-soft">{label}</div></div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

// Dependency-free SVG bar chart.
export function BarChart({ data, xKey, yKey, height = 160, color = '#111111' }) {
  const max = Math.max(1, ...data.map((d) => d[yKey]));
  const w = 100 / data.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height / 4}`} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="बार चार्ट">
        {data.map((d, i) => {
          const h = (d[yKey] / max) * (height / 4 - 4);
          return <rect key={i} x={i * w + w * 0.15} y={height / 4 - h} width={w * 0.7} height={h} rx="0.6" fill={color}><title>{`${d[xKey]}: ${d[yKey]}`}</title></rect>;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink-faint"><span>{String(data[0]?.[xKey]).slice(5)}</span><span>{String(data[data.length - 1]?.[xKey]).slice(5)}</span></div>
    </div>
  );
}

function AdminOverview() {
  const { data: s, loading, error, reload } = useFetch('/admin/stats');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const maxCat = Math.max(1, ...s.byCategory.map((c) => c.views));
  return (
    <>
      <PageTitle title="साइट एनालिटिक्स" sub="आपके डेटाबेस के सीधे आँकड़े।" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Eye} label="खबरों के कुल व्यू" value={compact(s.totalViews)} />
        <Stat icon={FileText} label="पब्लिश खबरें" value={s.articles.published} tone="text-emerald-700" to="/dashboard/review" />
        <Stat icon={Clock} label="समीक्षा के इंतज़ार में" value={s.articles.pending} tone="text-amber-700" to="/dashboard/review" />
        <Stat icon={Users} label="रजिस्टर्ड यूज़र" value={s.users.total} to="/dashboard/users" />
        <Stat icon={Heart} label="कुल लाइक" value={compact(s.totalLikes)} tone="text-signal-500" />
        <Stat icon={MessageSquare} label="कमेंट" value={s.comments} to="/dashboard/comments" />
        <Stat icon={Mail} label="न्यूज़लेटर सब्सक्राइबर" value={s.subscribers} to="/dashboard/subscribers" />
        <Stat icon={Users} label="रिपोर्टर" value={s.users.reporters} to="/dashboard/users" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2"><h2 className="mb-3 font-bold">खबरों के व्यू, पिछले 14 दिन</h2><BarChart data={s.viewsByDay} xKey="day" yKey="views" /></section>
        <section className="panel p-5"><h2 className="mb-3 font-bold">श्रेणी के हिसाब से व्यू</h2>
          <ul className="space-y-3">{s.byCategory.map((c) => (
            <li key={c.name}><div className="flex justify-between text-xs font-semibold"><span>{c.nameHi || c.name}</span><span className="text-ink-faint">{compact(c.views)} व्यू · {c.articles} खबरें</span></div><div className="mt-1 h-2 rounded bg-mist"><div className="h-2 rounded" style={{ width: `${(c.views / maxCat) * 100}%`, background: c.color }} /></div></li>
          ))}</ul>
        </section>
        <section className="panel p-5 xl:col-span-2"><h2 className="mb-2 font-bold">सबसे ज़्यादा पढ़ी गई खबरें</h2>
          <table className="w-full"><tbody>{s.topArticles.map((a) => (
            <tr key={a._id} className="border-t border-mist-line first:border-0"><td className="py-2 pr-3 text-sm"><Link className="font-semibold hover:underline" to={`/article/${a.slug}`}>{a.title}</Link></td><td className="whitespace-nowrap py-2 text-right text-xs text-ink-faint">{compact(a.views)} व्यू · {a.likesCount} लाइक · {a.commentsCount} कमेंट</td></tr>
          ))}</tbody></table>
        </section>
        <section className="panel p-5"><h2 className="mb-2 font-bold">नए सदस्य</h2>
          <ul className="space-y-2">{s.recentUsers.map((u) => <li key={u._id} className="flex items-center justify-between text-sm"><span className="truncate">{u.name}</span><Badge value={u.role} /></li>)}</ul>
        </section>
      </div>
    </>
  );
}

function ReporterOverview() {
  const { user } = useAuth();
  const { data: s, loading, error, reload } = useFetch('/reporter/stats');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageTitle title={`नमस्ते, ${user.name.split(' ')[0]}`} sub="आपका न्यूज़रूम एक नज़र में।" actions={<Link to="/dashboard/articles/new" className="btn-primary"><PenSquare size={16} /> खबर लिखें</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FileText} label="पब्लिश" value={s.published} tone="text-emerald-700" />
        <Stat icon={Clock} label="मंज़ूरी के इंतज़ार में" value={s.pending} tone="text-amber-700" />
        <Stat icon={FileText} label="ड्राफ़्ट" value={s.draft} tone="text-slate-600" />
        <Stat icon={FileText} label="बदलाव ज़रूरी" value={s.rejected} tone="text-signal-500" to="/dashboard/articles" />
        <Stat icon={Eye} label="कुल व्यू" value={compact(s.views)} />
        <Stat icon={Heart} label="लाइक" value={s.likes} tone="text-signal-500" />
        <Stat icon={MessageSquare} label="कमेंट" value={s.comments} />
      </div>
      <section className="panel mt-6 p-5"><h2 className="mb-2 font-bold">आपकी सबसे ज़्यादा पढ़ी गई खबरें</h2>
        {s.top.length ? <ul>{s.top.map((a) => <li key={a._id} className="flex justify-between gap-4 border-t border-mist-line py-2 text-sm first:border-0"><Link to={`/article/${a.slug}`} className="font-semibold hover:underline">{a.title}</Link><span className="shrink-0 text-xs text-ink-faint">{compact(a.views)} व्यू</span></li>)}</ul> : <p className="text-sm text-ink-soft">अपनी पहली खबर पब्लिश कीजिए, फिर देखिए वह कैसा प्रदर्शन करती है।</p>}
      </section>
    </>
  );
}

function ReaderOverview() {
  const { user } = useAuth();
  const bm = useFetch('/articles/bookmarks');
  return (
    <>
      <PageTitle title={`स्वागत है, ${user.name.split(' ')[0]}`} sub="आपका पढ़ने का कोना।" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat icon={Bookmark} label="सेव की हुई खबरें" value={bm.data ? bm.data.articles.length : '–'} to="/bookmarks" />
        <Stat icon={Heart} label="पसंदीदा सेक्शन" value={user.interests?.length || 0} tone="text-signal-500" to="/dashboard/profile" />
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="font-bold">क्या आप खबरें लिखना चाहते हैं?</h2>
        <p className="mt-1 text-sm text-ink-soft">रिपोर्टर खबरें लिखते हैं, जिन्हें पब्लिश होने से पहले संपादक जाँचता है। {user.reporterRequest === 'pending' ? 'आपका अनुरोध एडमिन के इंतज़ार में है।' : 'प्रोफ़ाइल से अनुरोध भेजिए।'}</p>
        <Link to="/dashboard/profile" className="btn-outline mt-3">प्रोफ़ाइल खोलें</Link>
      </section>
    </>
  );
}

export default function Overview() {
  const { user } = useAuth();
  return user.role === 'admin' ? <AdminOverview /> : user.role === 'reporter' ? <ReporterOverview /> : <ReaderOverview />;
}
