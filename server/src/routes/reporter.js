// Article authoring endpoints. Used by both the Reporter dashboard and (with extra powers) the Admin dashboard.
const router = require('express').Router();
const { body } = require('express-validator');
const Article = require('../models/Article');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const { upload, fileUrl, removeFile } = require('../middleware/upload');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { articleFields, uniqueSlug, publish, populateList } = require('../utils/articleService');
const { emit } = require('../utils/realtime');

router.use(protect, restrictTo('reporter', 'admin'));

const rules = (creating) => [
  body('title').trim().isLength({ min: 8, max: 220 }).withMessage('हेडलाइन 8–220 अक्षर की होनी चाहिए।'),
  body('summary').trim().isLength({ min: 20, max: 400 }).withMessage('सार 20–400 अक्षर का होना चाहिए।'),
  body('content').custom((v) => (String(v || '').replace(/<[^>]*>/g, '').trim().length >= 50)).withMessage('खबर का मुख्य हिस्सा कम से कम 50 अक्षर का होना चाहिए।'),
  body('category').isMongoId().withMessage('कृपया श्रेणी चुनिए।'),
  creating ? body('imageCaption').optional() : body('imageCaption').optional(),
];

const isAdmin = (req) => req.user.role === 'admin';

async function loadOwned(req) {
  const a = await Article.findById(req.params.id);
  if (!a) throw new ApiError(404, 'खबर नहीं मिली।');
  if (!isAdmin(req) && String(a.author) !== String(req.user._id)) throw new ApiError(403, 'यह आपकी खबर नहीं है।');
  return a;
}

async function assertCategory(id) {
  if (!(await Category.exists({ _id: id, isActive: true }))) throw new ApiError(400, 'यह श्रेणी मौजूद नहीं है।');
}

// Reporter -> "pending" (needs approval). Admin -> published immediately.
async function submitFor(req, article) {
  if (isAdmin(req)) {
    await publish(article, { breaking: req.body.isBreaking === 'true' || req.body.isBreaking === true });
  } else {
    article.status = 'pending';
    article.rejectionReason = '';
    await article.save();
    emit('article:pending', { _id: article._id, title: article.title }, 'role:admin');
  }
}

router.get('/stats', asyncHandler(async (req, res) => {
  const mine = isAdmin(req) ? {} : { author: req.user._id };
  const articles = await Article.find(mine).select('status views likesCount commentsCount title slug').lean();
  const by = (s) => articles.filter((a) => a.status === s).length;
  res.json({
    total: articles.length,
    draft: by('draft'),
    pending: by('pending'),
    published: by('published'),
    rejected: by('rejected'),
    views: articles.reduce((n, a) => n + a.views, 0),
    likes: articles.reduce((n, a) => n + a.likesCount, 0),
    comments: articles.reduce((n, a) => n + a.commentsCount, 0),
    top: articles.filter((a) => a.status === 'published').sort((a, b) => b.views - a.views).slice(0, 5),
  });
}));

router.get('/articles', asyncHandler(async (req, res) => {
  const filter = isAdmin(req) && req.query.all === 'true' ? {} : { author: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 10;
  const [articles, total] = await Promise.all([
    Article.find(filter).select('-content -likes').populate(populateList).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Article.countDocuments(filter),
  ]);
  res.json({ articles, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/articles/:id', validId(), asyncHandler(async (req, res) => {
  const a = await loadOwned(req);
  res.json({ article: a });
}));

router.post('/articles', upload.single('coverImage'), rules(true), validate, asyncHandler(async (req, res) => {
  await assertCategory(req.body.category);
  const fields = articleFields(req.body);
  const article = await Article.create({
    ...fields,
    slug: await uniqueSlug(fields.title),
    author: req.user._id,
    coverImage: fileUrl(req.file) || '',
    status: 'draft',
    isFeatured: isAdmin(req) && (req.body.isFeatured === 'true' || req.body.isFeatured === true),
  });
  if (req.body.submit === 'true' || req.body.submit === true) await submitFor(req, article);
  res.status(201).json({ article });
}));

router.put('/articles/:id', validId(), upload.single('coverImage'), rules(false), validate, asyncHandler(async (req, res) => {
  const article = await loadOwned(req);
  if (!isAdmin(req) && article.status === 'published') {
    throw new ApiError(403, 'पब्लिश खबर सिर्फ़ एडमिन बदल सकता है। बदलाव के लिए एडमिन से पब्लिश हटवाइए।');
  }
  await assertCategory(req.body.category);
  const fields = articleFields(req.body);
  if (fields.title && fields.title !== article.title && article.status !== 'published') fields.slug = await uniqueSlug(fields.title, article._id);
  if (req.file) {
    removeFile(article.coverImage);
    fields.coverImage = fileUrl(req.file);
  }
  Object.assign(article, fields);
  if (isAdmin(req)) {
    if (req.body.isFeatured !== undefined) article.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;
    if (req.body.isBreaking !== undefined) article.isBreaking = req.body.isBreaking === 'true' || req.body.isBreaking === true;
  }
  if (article.status === 'rejected') article.status = 'draft';
  await article.save();
  if (req.body.submit === 'true' || req.body.submit === true) await submitFor(req, article);
  res.json({ article });
}));

router.post('/articles/:id/submit', validId(), asyncHandler(async (req, res) => {
  const article = await loadOwned(req);
  if (article.status === 'published') throw new ApiError(400, 'खबर पहले से पब्लिश है।');
  if (article.status === 'pending' && !isAdmin(req)) throw new ApiError(400, 'खबर पहले से मंज़ूरी के इंतज़ार में है।');
  await submitFor(req, article);
  res.json({ article });
}));

router.delete('/articles/:id', validId(), asyncHandler(async (req, res) => {
  const article = await loadOwned(req);
  if (!isAdmin(req) && article.status === 'published') throw new ApiError(403, 'पब्लिश खबर सिर्फ़ एडमिन हटा सकता है।');
  removeFile(article.coverImage);
  await Comment.deleteMany({ article: article._id });
  await article.deleteOne();
  res.json({ message: 'खबर हटा दी गई।' });
}));

module.exports = router;
