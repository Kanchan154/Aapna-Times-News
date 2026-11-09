import { useParams, useSearchParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { useCategories } from '../hooks/useCategories';
import ArticleCard from '../components/ArticleCard';
import WeatherWidget from '../components/WeatherWidget';
import AdSlot from '../components/AdSlot';
import Seo from '../components/Seo';
import { catName } from '../lib/format';
import { EmptyState, ErrorState, Pagination, Spinner } from '../components/ui';
import { TrendingList } from './Home';

export default function Category() {
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const page = parseInt(sp.get('page'), 10) || 1;
  const sort = sp.get('sort') === 'popular' ? 'popular' : 'latest';
  const { categories } = useCategories();
  const cat = categories.find((c) => c.slug === slug);
  const { data, loading, error, reload } = useFetch('/articles', { params: { category: slug, page, sort, limit: 10 } });
  const trending = useFetch('/articles/trending', { params: { limit: 5 } });
  const set = (patch) => setSp({ page: 1, sort, ...patch });

  return (
    <div>
      <Seo title={catName(cat)} description={cat?.description} path={`/category/${slug}`} />
      <div className="text-white" style={{ background: `linear-gradient(120deg, ${cat?.color || '#111111'}, #111111)` }}>
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-4xl font-extrabold">{catName(cat) || slug}</h1>
          {cat?.description && <p className="mt-1 text-white/80">{cat.description}</p>}
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-ink-soft">{data ? `कुल ${data.total} खबरें` : ' '}</p>
            <div className="inline-flex rounded-md border border-mist-line p-0.5 text-sm" role="group" aria-label="क्रम">
              {['latest', 'popular'].map((s) => <button key={s} onClick={() => set({ sort: s })} aria-pressed={sort === s} className={`rounded px-3 py-1 font-semibold capitalize ${sort === s ? 'bg-indigo-700 text-white' : 'text-ink-soft'}`}>{s}</button>)}
            </div>
          </div>
          {loading && !data && <Spinner />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && !data.articles.length && <EmptyState title="इस सेक्शन में अभी कोई खबर नहीं" text="थोड़ी देर बाद फिर देखिए।" />}
          {data?.articles.map((a) => <ArticleCard key={a._id} article={a} variant="row" />)}
          <Pagination page={page} pages={data?.pages} onChange={(p) => { setSp({ page: p, sort }); window.scrollTo(0, 0); }} />
        </section>
        <aside className="space-y-6">
          {slug === 'weather' && <WeatherWidget />}
          {trending.data && <TrendingList items={trending.data.articles} />}
          {slug !== 'weather' && <WeatherWidget />}
          <AdSlot placement="sidebar" />
        </aside>
      </div>
    </div>
  );
}
