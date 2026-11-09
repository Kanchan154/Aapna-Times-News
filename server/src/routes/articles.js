const router = require('express').Router();
const Article = require('../models/Article');
const Category = require('../models/Category');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { validId } = require('../middleware/validate');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { LIST_SELECT, populateList, publicFilter, trackView } = require('../utils/articleService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageParams = (q, defLimit = 12) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const list = (filter, sort, limit, skip = 0) =>
  Article.find(filter).select(LIST_SELECT).populate(populateList).sort(sort).skip(skip).limit(limit).lean();

// ---------- Search / filter / paginate ----------
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = publicFilter();

  if (req.query.category) {
    const cat = await Category.findOne({ slug: String(req.query.category).toLowerCase() });
    if (!cat) return res.json({ articles: [], total: 0, page, pages: 0, category: null });
    filter.category = cat._id;
  }
  if (req.query.tag) filter.tags = String(req.query.tag).toLowerCase();
  if (req.query.author && require('mongoose').isValidObjectId(req.query.author)) filter.author = req.query.author;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).trim().slice(0, 80)), 'i');
    filter.$or = [{ title: rx }, { summary: rx }, { tags: rx }, { content: rx }];
  }
  if (req.query.from || req.query.to) {
    const range = {};
    if (req.query.from) range.$gte = new Date(req.query.from);
    if (req.query.to) range.$lte = new Date(new Date(req.query.to).getTime() + 86399999);
    filter.publishedAt = { ...filter.publishedAt, ...range };
  }

  const sort = req.query.sort === 'popular' ? { views: -1, publishedAt: -1 } : { publishedAt: -1 };
  const [articles, total] = await Promise.all([list(filter, sort, limit, skip), Article.countDocuments(filter)]);
  res.json({ articles, total, page, pages: Math.ceil(total / limit) });
}));

// ---------- Homepage bundle ----------
router.get('/home', asyncHandler(async (_req, res) => {
  const base = publicFilter();
  const [featured, breaking, latest, categories] = await Promise.all([
    list({ ...base, isFeatured: true }, { publishedAt: -1 }, 5),
    list({ ...base, isBreaking: true }, { publishedAt: -1 }, 8),
    list(base, { publishedAt: -1 }, 12),
    Category.find({ isActive: true }).sort('order name').lean(),
  ]);
  const trending = await getTrending(6);
  const sections = await Promise.all(
    categories.map(async (c) => ({ category: c, articles: await list({ ...base, category: c._id }, { publishedAt: -1 }, 4) }))
  );
  res.json({ featured, breaking, latest, trending, sections: sections.filter((s) => s.articles.length) });
}));

async function getTrending(limit) {
  const since = new Date(Date.now() - 14 * 86400000);
  const base = publicFilter();
  let items = await list({ ...base, publishedAt: { ...base.publishedAt, $gte: since } }, { views: -1, likesCount: -1 }, limit);
  if (items.length < limit) {
    const have = items.map((i) => i._id);
    const more = await list({ ...base, _id: { $nin: have } }, { views: -1, publishedAt: -1 }, limit - items.length);
    items = items.concat(more);
  }
  return items;
}

router.get('/breaking', asyncHandler(async (_req, res) => {
  res.json({ articles: await list({ ...publicFilter(), isBreaking: true }, { publishedAt: -1 }, 10) });
}));

router.get('/trending', asyncHandler(async (req, res) => {
  res.json({ articles: await getTrending(Math.min(20, parseInt(req.query.limit, 10) || 8)) });
}));

// Quick suggestions for the search box.
router.get('/suggest', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ suggestions: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const items = await Article.find({ ...publicFilter(), title: rx }).select('title slug').sort({ publishedAt: -1 }).limit(6).lean();
  res.json({ suggestions: items });
}));

// ---------- Personalised feed & bookmarks ----------
router.get('/feed', protect, asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const interests = req.user.interests || [];
  const filter = publicFilter();
  if (interests.length) filter.category = { $in: interests };
  const [articles, total] = await Promise.all([list(filter, { publishedAt: -1 }, limit, skip), Article.countDocuments(filter)]);
  res.json({ articles, total, page, pages: Math.ceil(total / limit), personalized: interests.length > 0 });
}));

router.get('/bookmarks', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  const articles = await list({ _id: { $in: user.bookmarks || [] }, status: 'published' }, { publishedAt: -1 }, 100);
  res.json({ articles });
}));

// ---------- Like / bookmark (toggle) ----------
async function findPublished(id) {
  const a = await Article.findOne({ _id: id, status: 'published' }).select('_id');
  if (!a) throw new ApiError(404, 'खबर नहीं मिली।');
  return a;
}

router.post('/:id/like', protect, validId(), asyncHandler(async (req, res) => {
  await findPublished(req.params.id);
  const already = await Article.exists({ _id: req.params.id, likes: req.user._id });
  await Article.updateOne(
    { _id: req.params.id },
    already ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } }
  );
  const doc = await Article.findById(req.params.id).select('likes');
  await Article.updateOne({ _id: req.params.id }, { likesCount: doc.likes.length });
  res.json({ liked: !already, likesCount: doc.likes.length });
}));

router.post('/:id/bookmark', protect, validId(), asyncHandler(async (req, res) => {
  await findPublished(req.params.id);
  const has = (req.user.bookmarks || []).some((b) => String(b) === req.params.id);
  await User.updateOne({ _id: req.user._id }, has ? { $pull: { bookmarks: req.params.id } } : { $addToSet: { bookmarks: req.params.id } });
  res.json({ bookmarked: !has });
}));

// ---------- Single article ----------
router.get('/:slug', optionalAuth, asyncHandler(async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug })
    .populate([{ path: 'category', select: 'name nameHi slug color' }, { path: 'author', select: 'name avatar bio' }])
    .lean();
  if (!article) throw new ApiError(404, 'खबर नहीं मिली।');

  const isPublic = article.status === 'published' && article.publishedAt <= new Date();
  const canPreview = req.user && (req.user.role === 'admin' || String(article.author._id) === String(req.user._id));
  if (!isPublic && !canPreview) throw new ApiError(404, 'खबर नहीं मिली।');

  if (isPublic) trackView(article);
  const uid = req.user && String(req.user._id);
  article.liked = !!uid && article.likes.some((l) => String(l) === uid);
  article.bookmarked = !!uid && (req.user.bookmarks || []).some((b) => String(b) === String(article._id));
  delete article.likes;
  if (isPublic) article.views += 1;
  res.json({ article });
}));

router.get('/:slug/related', asyncHandler(async (req, res) => {
  const a = await Article.findOne({ slug: req.params.slug }).select('category tags').lean();
  if (!a) return res.json({ articles: [] });
  const base = { ...publicFilter(), _id: { $ne: a._id } };
  let items = await list({ ...base, category: a.category }, { publishedAt: -1 }, 4);
  if (items.length < 4 && a.tags.length) {
    const have = [a._id, ...items.map((i) => i._id)];
    items = items.concat(await list({ ...base, _id: { $nin: have }, tags: { $in: a.tags } }, { publishedAt: -1 }, 4 - items.length));
  }
  res.json({ articles: items });
}));

module.exports = router;
