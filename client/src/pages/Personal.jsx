import { Link } from 'react-router-dom';
import { useState } from 'react';
import useFetch from '../hooks/useFetch';
import ArticleCard from '../components/ArticleCard';
import Seo from '../components/Seo';
import { EmptyState, ErrorState, Pagination, Spinner } from '../components/ui';

export function Feed() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/articles/feed', { params: { page, limit: 10 } });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Seo title="मेरा फ़ीड" noindex />
      <h1 className="text-3xl font-extrabold">आपके लिए</h1>
      {data && <p className="mt-1 text-sm text-ink-soft">{data.personalized ? 'आपके चुने हुए सेक्शन की खबरें।' : 'आपने अभी कोई पसंद नहीं चुनी, इसलिए ताज़ा खबरें दिखा रहे हैं।'} <Link to="/dashboard/profile" className="font-bold text-indigo-700">पसंद चुनिए</Link></p>}
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.articles.length && <EmptyState title="अभी कोई खबर नहीं" />}
      <div className="mt-3">{data?.articles.map((a) => <ArticleCard key={a._id} article={a} variant="row" />)}</div>
      <Pagination page={page} pages={data?.pages} onChange={(p) => { setPage(p); window.scrollTo(0, 0); }} />
    </div>
  );
}

export function Bookmarks() {
  const { data, loading, error, reload } = useFetch('/articles/bookmarks');
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Seo title="बुकमार्क" noindex />
      <h1 className="text-3xl font-extrabold">आपके बुकमार्क</h1>
      {loading && !data && <Spinner />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && !data.articles.length && <div className="mt-5"><EmptyState title="अभी कोई बुकमार्क नहीं" text="किसी भी खबर पर बुकमार्क आइकन दबाइए, खबर यहाँ सेव हो जाएगी।" action={<Link className="btn-primary" to="/">खबरें देखें</Link>} /></div>}
      <div className="mt-3">{data?.articles.map((a) => <ArticleCard key={a._id} article={a} variant="row" />)}</div>
    </div>
  );
}
