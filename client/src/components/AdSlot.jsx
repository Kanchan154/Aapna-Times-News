import { useEffect, useState } from 'react';
import { api, img } from '../lib/api';

export default function AdSlot({ placement = 'sidebar', className = '' }) {
  const [ad, setAd] = useState(null);
  useEffect(() => {
    api.get('/ads', { params: { placement } }).then((r) => {
      const list = r.data.ads;
      setAd(list.length ? list[Math.floor(Math.random() * list.length)] : null);
    }).catch(() => {});
  }, [placement]);
  if (!ad) return null;
  return (
    <aside className={className} aria-label="विज्ञापन">
      <a href={ad.link} target="_blank" rel="noopener noreferrer sponsored" onClick={() => api.post(`/ads/${ad._id}/click`).catch(() => {})} className="block overflow-hidden rounded-lg border border-mist-line">
        <img src={img(ad.image)} alt={ad.title} className="w-full" loading="lazy" />
      </a>
      <p className="mt-1 text-center text-[11px] text-ink-faint">विज्ञापन</p>
    </aside>
  );
}
