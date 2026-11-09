import { Link } from 'react-router-dom';
import { Clock, Heart, MessageCircle, Eye } from 'lucide-react';
import { img } from '../lib/api';
import { timeAgo, compact, catName, readTime } from '../lib/format';

export function Cover({ article, className = '', sizes }) {
  const color = article.category?.color || '#111111';
  return article.coverImage ? (
    <img src={img(article.coverImage)} alt={article.imageCaption || article.title} loading="lazy" sizes={sizes} className={`h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`h-full w-full ${className}`} style={{ background: `linear-gradient(135deg, ${color}, #111111)` }} />
  );
}

export const CategoryTag = ({ category, onImage }) =>
  category ? (
    <Link to={`/category/${category.slug}`} onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-xs font-bold ${onImage ? 'rounded bg-white/95 px-2 py-0.5 text-ink' : ''}`} style={onImage ? undefined : { color: category.color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />{catName(category)}
    </Link>
  ) : null;

export const Meta = ({ article, light }) => (
  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${light ? 'text-white/80' : 'text-ink-faint'}`}>
    <span className="inline-flex items-center gap-1"><Clock size={12} />{timeAgo(article.publishedAt || article.createdAt)}</span>
    {article.readingTime ? <span>{readTime(article.readingTime)}</span> : null}
  </div>
);

// variant: lead | standard | row | compact
export default function ArticleCard({ article, variant = 'standard' }) {
  const to = `/article/${article.slug}`;
  if (variant === 'lead') {
    return (
      <article className="group relative isolate flex min-h-[320px] overflow-hidden rounded-xl bg-ink sm:min-h-[430px]">
        <div className="absolute inset-0 -z-10"><Cover article={article} className="transition-transform duration-500 group-hover:scale-[1.03]" /></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <div className="mt-auto w-full p-5 sm:p-8">
          <div className="mb-3 flex items-center gap-2">
            <CategoryTag category={article.category} onImage />
            {article.isBreaking && <span className="rounded bg-signal-500 px-2 py-0.5 text-xs font-bold text-white">ब्रेकिंग</span>}
          </div>
          <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-4xl">
            <Link to={to} className="after:absolute after:inset-0 hover:underline">{article.title}</Link>
          </h2>
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/85 sm:text-base">{article.summary}</p>
          <div className="mt-3"><Meta article={article} light /></div>
        </div>
      </article>
    );
  }
  if (variant === 'row') {
    return (
      <article className="group relative flex gap-4 border-b border-mist-line py-4 last:border-0">
        <div className="aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-lg bg-mist sm:w-44"><Cover article={article} className="transition-transform duration-300 group-hover:scale-105" /></div>
        <div className="min-w-0 flex-1">
          <CategoryTag category={article.category} />
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug sm:text-xl"><Link to={to} className="after:absolute after:inset-0 group-hover:underline">{article.title}</Link></h3>
          <p className="mt-1 hidden line-clamp-2 text-sm text-ink-soft sm:block">{article.summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3"><Meta article={article} />
            <span className="hidden items-center gap-3 text-xs text-ink-faint sm:inline-flex"><span className="inline-flex items-center gap-1"><Heart size={12} />{article.likesCount}</span><span className="inline-flex items-center gap-1"><MessageCircle size={12} />{article.commentsCount}</span><span className="inline-flex items-center gap-1"><Eye size={12} />{compact(article.views)}</span></span>
          </div>
        </div>
      </article>
    );
  }
  if (variant === 'compact') {
    return (
      <article className="group relative border-b border-mist-line py-3 last:border-0">
        <CategoryTag category={article.category} />
        <h3 className="mt-0.5 line-clamp-3 text-[15px] font-bold leading-snug"><Link to={to} className="after:absolute after:inset-0 group-hover:underline">{article.title}</Link></h3>
        <div className="mt-1"><Meta article={article} /></div>
      </article>
    );
  }
  return (
    <article className="group relative flex flex-col">
      <div className="aspect-[16/10] overflow-hidden rounded-lg bg-mist"><Cover article={article} className="transition-transform duration-300 group-hover:scale-105" /></div>
      <div className="mt-3"><CategoryTag category={article.category} /></div>
      <h3 className="mt-1 line-clamp-3 text-lg font-bold leading-snug"><Link to={to} className="after:absolute after:inset-0 group-hover:underline">{article.title}</Link></h3>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{article.summary}</p>
      <div className="mt-2"><Meta article={article} /></div>
    </article>
  );
}

export const CardSkeletons = ({ n = 4 }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {[...Array(n)].map((_, i) => (
      <div key={i} className="animate-pulse"><div className="aspect-[16/10] rounded-lg bg-mist" /><div className="mt-3 h-3 w-20 rounded bg-mist" /><div className="mt-2 h-5 rounded bg-mist" /><div className="mt-2 h-5 w-2/3 rounded bg-mist" /></div>
    ))}
  </div>
);
