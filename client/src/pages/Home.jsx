import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { useLive } from '../context/SocketContext';
import ArticleCard, { CardSkeletons } from '../components/ArticleCard';
import WeatherWidget from '../components/WeatherWidget';
import AdSlot from '../components/AdSlot';
import NewsletterBox from '../components/NewsletterBox';
import Seo from '../components/Seo';
import { catName } from '../lib/format';
import { ErrorState, EmptyState, Skeleton } from '../components/ui';
import { useToast } from '../context/ToastContext';

export function TrendingList({ items }) {
  return (
    <section className="panel p-4" aria-label="ट्रेंडिंग">
      <h2 className="mb-1 border-b-2 border-marigold-500 pb-2 text-lg font-extrabold">अभी ट्रेंड में</h2>
      <ol>
        {items.map((a, i) => (
          <li key={a._id} className="flex gap-3 border-b border-mist-line py-3 last:border-0">
            <span className="font-display text-3xl font-extrabold leading-none text-indigo-200">{i + 1}</span>
            <div className="min-w-0"><Link to={`/article/${a.slug}`} className="line-clamp-3 text-[15px] font-bold leading-snug hover:underline">{a.title}</Link><span className="mt-0.5 block text-xs text-ink-faint">{catName(a.category)}</span></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Home() {
  const { data, loading, error, reload } = useFetch('/articles/home');
  const toast = useToast();
  // A new story was published somewhere: refresh quietly.
  useLive('article:published', (p) => { reload({ silent: true }); toast.info(`नई खबर: ${p.title}`, { to: `/article/${p.slug}` }); });

  if (error && !data) return <div className="mx-auto max-w-7xl px-4 py-10"><ErrorState message={error} onRetry={reload} /></div>;
  if (loading && !data) return (
    <div className="mx-auto max-w-7xl px-4 py-6"><Skeleton className="h-[430px] w-full" /><div className="mt-8"><CardSkeletons /></div></div>
  );
  const { featured, latest, trending, sections } = data;
  if (!latest.length) return <div className="mx-auto max-w-7xl px-4 py-10"><EmptyState title="अभी कोई खबर पब्लिश नहीं हुई" text="पहली खबर पब्लिश करने के लिए एडमिन या रिपोर्टर के रूप में लॉग इन करें।" /></div>;

  const hero = featured.length ? featured : latest.slice(0, 4);
  const heroIds = new Set(hero.map((h) => h._id));
  const rest = latest.filter((a) => !heroIds.has(a._id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Seo path="/" />
      <section className="grid gap-5 lg:grid-cols-3" aria-label="मुख्य खबरें">
        <div className="lg:col-span-2"><ArticleCard article={hero[0]} variant="lead" /></div>
        <div className="rounded-xl border border-mist-line px-4 py-1">
          {hero.slice(1, 5).map((a) => <ArticleCard key={a._id} article={a} variant="compact" />)}
          {hero.length < 2 && rest.slice(0, 3).map((a) => <ArticleCard key={a._id} article={a} variant="compact" />)}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-label="ताज़ा खबरें">
          <div className="mb-2 flex items-center justify-between border-b-2 border-indigo-700 pb-2">
            <h2 className="text-2xl font-extrabold">ताज़ा खबरें</h2>
            <Link to="/search" className="inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:underline">सारी खबरें <ArrowRight size={14} /></Link>
          </div>
          {rest.map((a) => <ArticleCard key={a._id} article={a} variant="row" />)}
        </section>
        <aside className="space-y-6">
          <TrendingList items={trending} />
          <WeatherWidget />
          <AdSlot placement="sidebar" />
          <NewsletterBox />
        </aside>
      </div>

      <AdSlot placement="inline" className="mx-auto mt-10 max-w-xl" />

      {sections.map(({ category, articles }) => (
        <section key={category._id} className="mt-12" aria-label={catName(category)}>
          <div className="mb-4 flex items-center justify-between border-b border-mist-line pb-2">
            <h2 className="flex items-center gap-2 text-xl font-extrabold"><span className="h-6 w-1.5 rounded" style={{ background: category.color }} />{catName(category)}</h2>
            <Link to={`/category/${category.slug}`} className="inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: category.color }}>और देखें <ArrowRight size={14} /></Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{articles.map((a) => <ArticleCard key={a._id} article={a} />)}</div>
        </section>
      ))}
    </div>
  );
}
