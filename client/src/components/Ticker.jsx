import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { useLive } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

// Live breaking-news strip. Re-fetches the moment an editor marks a story as breaking.
export default function Ticker() {
  const { data, reload } = useFetch('/articles/breaking');
  const toast = useToast();
  useLive('article:breaking', (p) => { reload({ silent: true }); toast.info(`ब्रेकिंग: ${p.title}`, { to: `/article/${p.slug}` }); });
  useLive('article:published', () => reload({ silent: true }));

  const items = data?.articles || [];
  if (!items.length) return null;
  const loop = items.length < 4 ? [...items, ...items, ...items, ...items] : [...items, ...items];

  return (
    <div className="ticker flex items-stretch bg-ink text-white" role="region" aria-label="ब्रेकिंग न्यूज़">
      <div className="z-10 flex shrink-0 items-center gap-2 bg-signal-500 px-3 text-xs font-extrabold sm:px-4 sm:text-sm">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
        ब्रेकिंग
      </div>
      <div className="relative flex-1 overflow-hidden py-2">
        <div className="ticker-track flex w-max gap-10 whitespace-nowrap pr-10">
          {loop.map((a, i) => (
            <Link key={`${a._id}-${i}`} to={`/article/${a.slug}`} className="text-sm hover:underline" tabIndex={i >= items.length ? -1 : 0}>
              <span className="mr-2 text-marigold-500">●</span>{a.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
