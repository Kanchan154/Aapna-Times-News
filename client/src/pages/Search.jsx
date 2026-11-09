import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { useCategories } from '../hooks/useCategories';
import ArticleCard from '../components/ArticleCard';
import Seo from '../components/Seo';
import { catName } from '../lib/format';
import SearchBar from '../components/SearchBar';
import { EmptyState, ErrorState, Pagination, Spinner } from '../components/ui';

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const { categories } = useCategories();
  const f = { q: sp.get('q') || '', category: sp.get('category') || '', tag: sp.get('tag') || '', sort: sp.get('sort') || 'latest', from: sp.get('from') || '', to: sp.get('to') || '', page: parseInt(sp.get('page'), 10) || 1 };
  const params = Object.fromEntries(Object.entries({ ...f, limit: 10 }).filter(([, v]) => v !== ''));
  const { data, loading, error, reload } = useFetch('/articles', { params });
  const update = (patch) => {
    const next = { ...f, page: 1, ...patch };
    setSp(Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !(k === 'page' && v === 1) && !(k === 'sort' && v === 'latest'))));
  };
  const heading = f.q ? `“${f.q}” के नतीजे` : f.tag ? `#${f.tag} टैग की खबरें` : 'सारी खबरें';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Seo title={heading} path="/search" noindex={!!f.q} />
      <h1 className="text-3xl font-extrabold">{heading}</h1>
      <div className="mt-4 md:hidden"><SearchBar /></div>
      <div className="panel mt-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center gap-2 text-sm font-bold lg:col-span-5"><SlidersHorizontal size={15} /> फ़िल्टर</div>
        <select className="input" aria-label="श्रेणी" value={f.category} onChange={(e) => update({ category: e.target.value })}>
          <option value="">सभी श्रेणियाँ</option>{categories.map((c) => <option key={c._id} value={c.slug}>{catName(c)}</option>)}
        </select>
        <select className="input" aria-label="क्रम" value={f.sort} onChange={(e) => update({ sort: e.target.value })}><option value="latest">सबसे नई पहले</option><option value="popular">सबसे ज़्यादा पढ़ी गई</option></select>
        <input type="date" className="input" aria-label="इस तारीख़ से" value={f.from} onChange={(e) => update({ from: e.target.value })} />
        <input type="date" className="input" aria-label="इस तारीख़ तक" value={f.to} onChange={(e) => update({ to: e.target.value })} />
        <button className="btn-outline" onClick={() => setSp({})}>सब हटाएँ</button>
      </div>
      <p className="mt-4 text-sm text-ink-soft">{data ? `${data.total} नतीजे` : ' '}</p>
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.articles.length && <EmptyState title="कोई मिलती-जुलती खबर नहीं मिली" text="कोई दूसरा शब्द आज़माइए या फ़िल्टर हटाइए।" />}
      {data?.articles.map((a) => <ArticleCard key={a._id} article={a} variant="row" />)}
      <Pagination page={f.page} pages={data?.pages} onChange={(p) => { update({ page: p }); window.scrollTo(0, 0); }} />
    </div>
  );
}
