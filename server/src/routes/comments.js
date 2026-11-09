const router = require('express').Router();
const { body } = require('express-validator');
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const { protect } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const { ApiError, asyncHandler, stripHtml } = require('../utils/helpers');
const { emit } = require('../utils/realtime');

const recount = async (articleId) => {
  const n = await Comment.countDocuments({ article: articleId, status: 'visible' });
  await Article.updateOne({ _id: articleId }, { commentsCount: n });
  return n;
};

router.get('/article/:id', validId(), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 10;
  const filter = { article: req.params.id, status: 'visible' };
  const [comments, total] = await Promise.all([
    Comment.find(filter).populate('user', 'name avatar role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Comment.countDocuments(filter),
  ]);
  res.json({ comments, total, page, pages: Math.ceil(total / limit) });
}));

router.post(
  '/article/:id',
  protect,
  validId(),
  [body('text').trim().isLength({ min: 2, max: 1000 }).withMessage('कमेंट 2–1000 अक्षर का होना चाहिए।')],
  validate,
  asyncHandler(async (req, res) => {
    const article = await Article.findOne({ _id: req.params.id, status: 'published' }).select('_id');
    if (!article) throw new ApiError(404, 'खबर नहीं मिली।');
    const comment = await Comment.create({ article: article._id, user: req.user._id, text: stripHtml(req.body.text) });
    const commentsCount = await recount(article._id);
    await comment.populate('user', 'name avatar role');
    emit('comment:new', { articleId: String(article._id), comment, commentsCount }, `article:${article._id}`);
    res.status(201).json({ comment, commentsCount });
  })
);

router.delete('/:id', protect, validId(), asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'कमेंट नहीं मिला।');
  if (req.user.role !== 'admin' && String(comment.user) !== String(req.user._id)) throw new ApiError(403, 'आप सिर्फ़ अपने कमेंट हटा सकते हैं।');
  await comment.deleteOne();
  const commentsCount = await recount(comment.article);
  emit('comment:removed', { articleId: String(comment.article), commentId: String(comment._id), commentsCount }, `article:${comment.article}`);
  res.json({ message: 'कमेंट हटा दिया गया।', commentsCount });
}));

module.exports = Object.assign(router, { recount });
