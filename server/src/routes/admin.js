const router = require('express').Router();
const { body } = require('express-validator');
const User = require('../models/User');
const Article = require('../models/Article');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const Ad = require('../models/Ad');
const Subscriber = require('../models/Subscriber');
const Visit = require('../models/Visit');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const { upload, fileUrl, removeFile } = require('../middleware/upload');
const { ApiError, asyncHandler, stripHtml } = require('../utils/helpers');
const { publish, populateList } = require('../utils/articleService');
const { recount } = require('./comments');
const { emit } = require('../utils/realtime');

router.use(protect, restrictTo('admin'));

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const paging = (q, limit = 10) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  return { page, limit, skip: (page - 1) * limit };
};

// ------------------------------------------------------------------ Analytics
router.get('/stats', asyncHandler(async (_req, res) => {
  const [users, readers, reporters, admins, draft, pending, published, rejected, comments, subscribers, ads] = await Promise.all([
    User.countDocuments(), User.countDocuments({ role: 'reader' }), User.countDocuments({ role: 'reporter' }), User.countDocuments({ role: 'admin' }),
    Article.countDocuments({ status: 'draft' }), Article.countDocuments({ status: 'pending' }),
    Article.countDocuments({ status: 'published' }), Article.countDocuments({ status: 'rejected' }),
    Comment.countDocuments(), Subscriber.countDocuments({ isActive: true }), Ad.countDocuments({ isActive: true }),
  ]);

  const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10));
  const visits = await Visit.find({ day: { $in: days } }).lean();
  const vmap = Object.fromEntries(visits.map((v) => [v.day, v.views]));
  const viewsByDay = days.map((d) => ({ day: d, views: vmap[d] || 0 }));

  // One accumulator per $group keeps this portable across MongoDB-compatible servers.
  const [viewsAgg, likesAgg] = await Promise.all([
    Article.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    Article.aggregate([{ $group: { _id: null, total: { $sum: '$likesCount' } } }]),
  ]);
  const topArticles = await Article.find({ status: 'published' }).select('title slug views likesCount commentsCount').sort({ views: -1 }).limit(5).lean();

  const [catCount, catViews] = await Promise.all([
    Article.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
    Article.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$category', v: { $sum: '$views' } } }]),
  ]);
  const cats = await Category.find().select('name nameHi color').lean();
  const byCategory = cats.map((c) => {
    const n = catCount.find((r) => String(r._id) === String(c._id));
    const v = catViews.find((r) => String(r._id) === String(c._id));
    return { name: c.name, nameHi: c.nameHi, color: c.color, articles: n ? n.n : 0, views: v ? v.v : 0 };
  });

  const recentUsers = await User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(5).lean();
  res.json({
    users: { total: users, readers, reporters, admins },
    articles: { draft, pending, published, rejected },
    comments, subscribers, ads,
    totalViews: viewsAgg[0] ? viewsAgg[0].total : 0,
    totalLikes: likesAgg[0] ? likesAgg[0].total : 0,
    viewsByDay, topArticles, byCategory, recentUsers,
  });
}));

// ------------------------------------------------------------------ Articles (moderation)
router.get('/articles', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.title = new RegExp(esc(String(req.query.q).slice(0, 80)), 'i');
  const [articles, total] = await Promise.all([
    Article.find(filter).select('-content -likes').populate(populateList).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Article.countDocuments(filter),
  ]);
  res.json({ articles, total, page, pages: Math.ceil(total / limit) });
}));

router.post('/articles/:id/approve', validId(), asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw new ApiError(404, 'खबर नहीं मिली।');
  await publish(article);
  emit('article:reviewed', { title: article.title, status: 'published' }, `user:${article.author}`);
  res.json({ article });
}));

router.post('/articles/:id/reject', validId(), [body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('रिपोर्टर को कारण बताइए (5–500 अक्षर)।')], validate, asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw new ApiError(404, 'खबर नहीं मिली।');
  article.status = 'rejected';
  article.rejectionReason = stripHtml(req.body.reason);
  await article.save();
  emit('article:reviewed', { title: article.title, status: 'rejected', reason: article.rejectionReason }, `user:${article.author}`);
  res.json({ article });
}));

router.post('/articles/:id/unpublish', validId(), asyncHandler(async (req, res) => {
  const article = await Article.findByIdAndUpdate(req.params.id, { status: 'draft', isBreaking: false, isFeatured: false }, { new: true });
  if (!article) throw new ApiError(404, 'खबर नहीं मिली।');
  res.json({ article });
}));

router.put('/articles/:id/flags', validId(), asyncHandler(async (req, res) => {
  const update = {};
  if (typeof req.body.isBreaking === 'boolean') update.isBreaking = req.body.isBreaking;
  if (typeof req.body.isFeatured === 'boolean') update.isFeatured = req.body.isFeatured;
  const article = await Article.findOneAndUpdate({ _id: req.params.id, status: 'published' }, update, { new: true }).populate('category', 'name slug');
  if (!article) throw new ApiError(404, 'सिर्फ़ पब्लिश खबर को फ़ीचर्ड या ब्रेकिंग बनाया जा सकता है।');
  if (update.isBreaking) emit('article:breaking', { _id: article._id, title: article.title, slug: article.slug, category: article.category && article.category.name, isBreaking: true });
  res.json({ article });
}));

// ------------------------------------------------------------------ Users
router.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.requests === 'true') filter.reporterRequest = 'pending';
  if (req.query.q) {
    const rx = new RegExp(esc(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  res.json({ users, total, page, pages: Math.ceil(total / limit) });
}));

router.put('/users/:id', validId(), [
  body('role').optional().isIn(['reader', 'reporter', 'admin']).withMessage('गलत रोल।'),
  body('isActive').optional().isBoolean().withMessage('isActive सही या गलत होना चाहिए।'),
  body('reporterRequest').optional().isIn(['none', 'pending', 'rejected']).withMessage('अनुरोध की स्थिति गलत है।'),
], validate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'यूज़र नहीं मिला।');
  const self = String(user._id) === String(req.user._id);
  if (self && ((req.body.role && req.body.role !== 'admin') || req.body.isActive === false)) {
    throw new ApiError(400, 'आप अपना खुद का रोल घटा या खाता बंद नहीं कर सकते।');
  }
  if (req.body.role) {
    user.role = req.body.role;
    if (req.body.role !== 'reader') user.reporterRequest = 'none';
  }
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive === true || req.body.isActive === 'true';
  if (req.body.reporterRequest) user.reporterRequest = req.body.reporterRequest;
  await user.save();
  res.json({ user: user.toSafe() });
}));

router.delete('/users/:id', validId(), asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'आप अपना खुद का खाता नहीं हटा सकते।');
  const authored = await Article.countDocuments({ author: req.params.id });
  if (authored) throw new ApiError(400, `इस यूज़र की ${authored} खबरें हैं। खाता हटाने की जगह बंद कीजिए।`);
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'यूज़र नहीं मिला।');
  await user.deleteOne();
  removeFile(user.avatar);
  const mine = await Comment.find({ user: user._id }).select('article').lean();
  await Comment.deleteMany({ user: user._id });
  await Promise.all([...new Set(mine.map((c) => String(c.article)))].map(recount));
  res.json({ message: 'यूज़र हटा दिया गया।' });
}));

// ------------------------------------------------------------------ Comments
router.get('/comments', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query);
  const filter = req.query.status ? { status: req.query.status } : {};
  const [comments, total] = await Promise.all([
    Comment.find(filter).populate('user', 'name email').populate('article', 'title slug').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Comment.countDocuments(filter),
  ]);
  res.json({ comments, total, page, pages: Math.ceil(total / limit) });
}));

router.put('/comments/:id/toggle', validId(), asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) throw new ApiError(404, 'कमेंट नहीं मिला।');
  c.status = c.status === 'visible' ? 'hidden' : 'visible';
  await c.save();
  const commentsCount = await recount(c.article);
  if (c.status === 'hidden') emit('comment:removed', { articleId: String(c.article), commentId: String(c._id), commentsCount }, `article:${c.article}`);
  res.json({ comment: c });
}));

// ------------------------------------------------------------------ Advertisements
const adRules = [
  body('title').trim().isLength({ min: 2, max: 100 }).withMessage('विज्ञापन का शीर्षक 2–100 अक्षर का होना चाहिए।'),
  body('link').trim().isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('लिंक http:// या https:// से शुरू होना चाहिए।'),
  body('placement').isIn(['header', 'sidebar', 'inline', 'footer']).withMessage('विज्ञापन की जगह चुनिए।'),
];

router.get('/ads', asyncHandler(async (_req, res) => res.json({ ads: await Ad.find().sort({ createdAt: -1 }).lean() })));

router.post('/ads', upload.single('image'), adRules, validate, asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(422, 'विज्ञापन की फ़ोटो अपलोड कीजिए।');
  const ad = await Ad.create({
    title: stripHtml(req.body.title), link: req.body.link, placement: req.body.placement, image: fileUrl(req.file),
    startsAt: req.body.startsAt || undefined, endsAt: req.body.endsAt || undefined,
  });
  res.status(201).json({ ad });
}));

router.put('/ads/:id', validId(), upload.single('image'), adRules, validate, asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) throw new ApiError(404, 'विज्ञापन नहीं मिला।');
  ad.title = stripHtml(req.body.title);
  ad.link = req.body.link;
  ad.placement = req.body.placement;
  ad.startsAt = req.body.startsAt || undefined;
  ad.endsAt = req.body.endsAt || undefined;
  if (req.body.isActive !== undefined) ad.isActive = req.body.isActive === 'true' || req.body.isActive === true;
  if (req.file) { removeFile(ad.image); ad.image = fileUrl(req.file); }
  await ad.save();
  res.json({ ad });
}));

router.put('/ads/:id/toggle', validId(), asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) throw new ApiError(404, 'विज्ञापन नहीं मिला।');
  ad.isActive = !ad.isActive;
  await ad.save();
  res.json({ ad });
}));

router.delete('/ads/:id', validId(), asyncHandler(async (req, res) => {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (ad) removeFile(ad.image);
  res.json({ message: 'विज्ञापन हटा दिया गया।' });
}));

// ------------------------------------------------------------------ Newsletter subscribers
router.get('/subscribers', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paging(req.query, 20);
  const [subscribers, total] = await Promise.all([Subscriber.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Subscriber.countDocuments()]);
  res.json({ subscribers, total, page, pages: Math.ceil(total / limit) });
}));

router.delete('/subscribers/:id', validId(), asyncHandler(async (req, res) => {
  await Subscriber.findByIdAndDelete(req.params.id);
  res.json({ message: 'सब्सक्राइबर हटा दिया गया।' });
}));

module.exports = router;
