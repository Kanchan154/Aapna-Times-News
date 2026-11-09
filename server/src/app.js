const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { notFound, errorHandler } = require('./middleware/error');
const { UPLOAD_DIR } = require('./middleware/upload');

const app = express();
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

app.set('trust proxy', 1); // needed behind Render / Nginx so rate-limit sees real IPs
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // lets the React app (other origin) show /uploads images
  contentSecurityPolicy: false, // the SPA is built separately; set a CSP at your reverse proxy if you need one
}));
app.use(cors({ origin: origins, credentials: true }));
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize()); // strips $ and . operators from input (NoSQL injection)

const limiter = (max, windowMin = 15) => rateLimit({ windowMs: windowMin * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { message: 'बहुत ज़्यादा अनुरोध हो गए। कुछ मिनट बाद फिर कोशिश कीजिए।' } });
app.use('/api', limiter(parseInt(process.env.RATE_LIMIT || '600', 10)));
app.use('/api/auth/login', limiter(parseInt(process.env.AUTH_RATE_LIMIT || '20', 10)));
app.use('/api/auth/register', limiter(parseInt(process.env.AUTH_RATE_LIMIT || '20', 10)));
app.use('/api/newsletter', limiter(30));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/reporter', require('./routes/reporter'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api', require('./routes/misc'));
app.get('/sitemap.xml', (req, res, next) => { req.url = '/sitemap.xml'; require('./routes/misc')(req, res, next); });
app.get('/rss.xml', (req, res, next) => { req.url = '/rss.xml'; require('./routes/misc')(req, res, next); });

app.use('/api', notFound);

// Optional single-server deployment: serve the built React app from ../client/dist
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  const Article = require('./models/Article');
  const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const site = () => (process.env.PUBLIC_URL || origins[0]).replace(/\/$/, '');

  app.use(express.static(dist, { index: false }));
  app.get('/', (_req, res) => res.type('html').send(indexHtml));

  // SEO: social crawlers (WhatsApp, Facebook, X) don't run JavaScript, so put title + Open Graph tags into the HTML itself.
  app.get('/article/:slug', async (req, res, next) => {
    try {
      const a = await Article.findOne({ slug: req.params.slug, status: 'published' }).select('title summary coverImage seoTitle seoDescription').lean();
      if (!a) return res.type('html').send(indexHtml);
      const title = esc(a.seoTitle || a.title);
      const desc = esc((a.seoDescription || a.summary).slice(0, 200));
      const image = a.coverImage ? `${site()}${a.coverImage}` : '';
      const tags = `<meta property="og:type" content="article" /><meta property="og:site_name" content="अपना टाइम्स न्यूज़" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${desc}" /><meta property="og:url" content="${site()}/article/${encodeURIComponent(req.params.slug)}" />${image ? `<meta property="og:image" content="${esc(image)}" />` : ''}<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`;
      const html = indexHtml
        .replace(/<title>.*?<\/title>/s, `<title>${title} | अपना टाइम्स न्यूज़</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${desc}" />`)
        .replace('</head>', `${tags}</head>`);
      res.type('html').send(html);
    } catch (e) { next(e); }
  });
  app.get('*', (_req, res) => res.type('html').send(indexHtml));
}

app.use(errorHandler);
module.exports = app;
