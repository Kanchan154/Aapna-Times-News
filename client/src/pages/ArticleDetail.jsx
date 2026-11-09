import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, Heart, Link2, Share2, Eye, Clock, MessageCircle } from 'lucide-react';
import { api, errMsg, img, SITE_URL } from '../lib/api';
import useFetch from '../hooks/useFetch';
import { fmtDateTime, compact, readTime } from '../lib/format';
import { STATUS_HI } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Seo from '../components/Seo';
import Comments from '../components/Comments';
import AdSlot from '../components/AdSlot';
import ArticleCard, { CategoryTag } from '../components/ArticleCard';
import { Avatar, ErrorState, Skeleton, EmptyState } from '../components/ui';
import { TrendingList } from './Home';
import NewsletterBox from '../components/NewsletterBox';

export default function ArticleDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const { data, loading, error, reload } = useFetch(`/articles/${encodeURIComponent(slug)}`);
  const related = useFetch(`/articles/${encodeURIComponent(slug)}/related`);
  const trending = useFetch('/articles/trending', { params: { limit: 5 } });
  const a = data?.article;
  const [state, setState] = useState({ liked: false, bookmarked: false, likes: 0, comments: 0 });

  useEffect(() => { if (a) setState({ liked: a.liked, bookmarked: a.bookmarked, likes: a.likesCount, comments: a.commentsCount }); }, [a]);

  const needLogin = () => { toast.info('पहले लॉग इन कीजिए।'); nav('/login', { state: { from: loc.pathname } }); };
  const act = async (kind) => {
    if (!user) return needLogin();
    try {
      const r = await api.post(`/articles/${a._id}/${kind}`);
      if (kind === 'like') { setState((s) => ({ ...s, liked: r.data.liked, likes: r.data.likesCount })); }
      else { setState((s) => ({ ...s, bookmarked: r.data.bookmarked })); toast.success(r.data.bookmarked ? 'बुकमार्क में सेव हो गई।' : 'बुकमार्क से हटा दी गई।'); }
    } catch (e) { toast.error(errMsg(e)); }
  };

  const url = `${SITE_URL}/article/${slug}`;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: a.title, url }); } catch { /* cancelled */ } }
    else copy();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success('लिंक कॉपी हो गया।'); } catch { toast.error('लिंक कॉपी नहीं हो सका।'); } };

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10"><Skeleton className="h-8 w-3/4" /><Skeleton className="mt-4 h-72 w-full" /><Skeleton className="mt-4 h-4 w-full" /><Skeleton className="mt-2 h-4 w-5/6" /></div>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16">{/not found/i.test(error) ? <EmptyState title="खबर नहीं मिली" text="हो सकता है खबर हटा दी गई हो या अभी पब्लिश न हुई हो।" action={<Link to="/" className="btn-primary">होम पर जाएँ</Link>} /> : <ErrorState message={error} onRetry={reload} />}</div>;

  const isPreview = a.status !== 'published';
  const jsonLd = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, description: a.summary, image: a.coverImage ? [img(a.coverImage).startsWith('http') ? img(a.coverImage) : SITE_URL + img(a.coverImage)] : undefined, datePublished: a.publishedAt, dateModified: a.updatedAt, author: [{ '@type': 'Person', name: a.author?.name }], publisher: { '@type': 'Organization', name: 'अपना टाइम्स न्यूज़' }, mainEntityOfPage: url };
  const wa = `https://wa.me/?text=${encodeURIComponent(`${a.title} ${url}`)}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(url)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 lg:grid-cols-3">
      <Seo title={a.seoTitle || a.title} description={a.seoDescription || a.summary} image={a.coverImage} path={`/article/${slug}`} type="article" jsonLd={jsonLd} noindex={isPreview} />
      <article className="lg:col-span-2">
        {isPreview && <div className="mb-4 rounded-md bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">सिर्फ़ प्रीव्यू — यह खबर अभी “{STATUS_HI[a.status] || a.status}” है और पाठकों को नहीं दिख रही।</div>}
        <div className="flex items-center gap-2"><CategoryTag category={a.category} />{a.isBreaking && <span className="rounded bg-signal-500 px-2 py-0.5 text-xs font-bold text-white">ब्रेकिंग</span>}</div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">{a.title}</h1>
        <p className="mt-3 text-lg text-ink-soft sm:text-xl">{a.summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-mist-line py-3 text-sm">
          <span className="flex items-center gap-2"><Avatar user={a.author} size={32} /><span className="font-bold">{a.author?.name}</span></span>
          <span className="inline-flex items-center gap-1 text-ink-faint"><Clock size={13} />{fmtDateTime(a.publishedAt || a.createdAt)} · {readTime(a.readingTime)}</span>
          <span className="inline-flex items-center gap-1 text-ink-faint"><Eye size={13} />{compact(a.views)}</span>
        </div>
        {a.coverImage && <figure className="mt-6"><img src={img(a.coverImage)} alt={a.imageCaption || a.title} className="w-full rounded-xl" />{a.imageCaption && <figcaption className="mt-2 text-xs text-ink-faint">{a.imageCaption}</figcaption>}</figure>}

        <div className="mt-6 flex flex-wrap items-center gap-2" role="toolbar" aria-label="खबर के विकल्प">
          <button onClick={() => act('like')} aria-pressed={state.liked} className={`btn-outline ${state.liked ? 'border-signal-500 text-signal-500' : ''}`}><Heart size={16} fill={state.liked ? 'currentColor' : 'none'} /> {state.likes}</button>
          <a href="#comments" className="btn-outline"><MessageCircle size={16} /> {state.comments}</a>
          <button onClick={() => act('bookmark')} aria-pressed={state.bookmarked} className={`btn-outline ${state.bookmarked ? 'border-indigo-700 text-indigo-700' : ''}`}><Bookmark size={16} fill={state.bookmarked ? 'currentColor' : 'none'} /> {state.bookmarked ? 'सेव हो गई' : 'सेव करें'}</button>
          <span className="mx-1 hidden h-6 w-px bg-mist-line sm:block" />
          <button onClick={share} className="btn-outline"><Share2 size={16} /> शेयर</button>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">व्हाट्सऐप</a>
          <a href={tw} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">X</a>
          <a href={fb} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">फ़ेसबुक</a>
          <button onClick={copy} className="btn-outline btn-sm" aria-label="लिंक कॉपी करें"><Link2 size={14} /></button>
        </div>

        <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: a.content }} />
        {a.tags?.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{a.tags.map((t) => <Link key={t} to={`/search?tag=${encodeURIComponent(t)}`} className="chip hover:bg-indigo-100">#{t}</Link>)}</div>}
        <AdSlot placement="inline" className="mx-auto mt-8 max-w-md" />
        {!isPreview && <div id="comments"><Comments articleId={a._id} onCount={(n) => setState((s) => ({ ...s, comments: n }))} /></div>}
      </article>

      <aside className="space-y-6">
        {related.data?.articles.length > 0 && <section className="panel p-4"><h2 className="mb-1 border-b-2 border-marigold-500 pb-2 text-lg font-extrabold">इससे जुड़ी खबरें</h2>{related.data.articles.map((r) => <ArticleCard key={r._id} article={r} variant="compact" />)}</section>}
        {trending.data && <TrendingList items={trending.data.articles} />}
        <AdSlot placement="sidebar" />
        <NewsletterBox />
      </aside>
    </div>
  );
}
