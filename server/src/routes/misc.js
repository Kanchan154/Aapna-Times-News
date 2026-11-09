const router = require('express').Router();
const Article = require('../models/Article');
const Category = require('../models/Category');
const { protect, restrictTo } = require('../middleware/auth');
const { upload, fileUrl } = require('../middleware/upload');
const { ApiError, asyncHandler } = require('../utils/helpers');

const site = () => (process.env.PUBLIC_URL || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
const xml = (s = '') => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const published = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Inline image upload for the article editor.
router.post('/upload', protect, restrictTo('reporter', 'admin'), upload.single('image'), (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'कृपया एक फ़ोटो चुनिए।'));
  res.status(201).json({ url: fileUrl(req.file) });
});

// Optional: headlines from NewsAPI.org (needs NEWSAPI_KEY). Used by reporters as story leads.
router.get('/external/headlines', protect, restrictTo('reporter', 'admin'), asyncHandler(async (req, res) => {
  const key = process.env.NEWSAPI_KEY;
  if (!key) throw new ApiError(503, 'बाहरी न्यूज़ चालू नहीं है। server/.env में NEWSAPI_KEY जोड़िए (newsapi.org से मुफ़्त कुंजी)।');
  const allowed = ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'];
  const category = allowed.includes(req.query.category) ? req.query.category : 'general';
  const country = /^[a-z]{2}$/i.test(req.query.country || '') ? req.query.country.toLowerCase() : 'in';
  const r = await fetch(`https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=12`, { headers: { 'X-Api-Key': key } });
  const data = await r.json();
  if (!r.ok || data.status !== 'ok') throw new ApiError(502, `NewsAPI में गड़बड़ी: ${data.message || r.status}`);
  res.json({
    articles: data.articles.map((a) => ({ title: a.title, summary: a.description || '', url: a.url, source: a.source && a.source.name, image: a.urlToImage, publishedAt: a.publishedAt })),
  });
}));

// ---------------- SEO: sitemap + RSS ----------------
router.get('/sitemap.xml', asyncHandler(async (_req, res) => {
  const [articles, cats] = await Promise.all([
    Article.find(published()).select('slug updatedAt').sort({ publishedAt: -1 }).limit(1000).lean(),
    Category.find({ isActive: true }).select('slug').lean(),
  ]);
  const urls = [
    `<url><loc>${site()}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    ...cats.map((c) => `<url><loc>${site()}/category/${xml(c.slug)}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`),
    ...articles.map((a) => `<url><loc>${site()}/article/${encodeURIComponent(a.slug)}</loc><lastmod>${a.updatedAt.toISOString()}</lastmod><priority>0.6</priority></url>`),
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
}));

router.get('/rss.xml', asyncHandler(async (_req, res) => {
  const items = await Article.find(published()).select('title slug summary publishedAt').sort({ publishedAt: -1 }).limit(30).lean();
  const body = items.map((a) => `<item><title>${xml(a.title)}</title><link>${site()}/article/${encodeURIComponent(a.slug)}</link><guid>${site()}/article/${encodeURIComponent(a.slug)}</guid><pubDate>${a.publishedAt.toUTCString()}</pubDate><description>${xml(a.summary)}</description></item>`).join('');
  res.type('application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>अपना टाइम्स न्यूज़</title><link>${site()}</link><description>अपना टाइम्स न्यूज़: ताज़ा खबरें और रोज़ के अपडेट</description><language>hi</language>${body}</channel></rss>`);
}));

module.exports = router;
