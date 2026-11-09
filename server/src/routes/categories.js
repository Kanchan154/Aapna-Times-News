const router = require('express').Router();
const { body } = require('express-validator');
const Category = require('../models/Category');
const Article = require('../models/Article');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const { ApiError, asyncHandler, slugify, stripHtml } = require('../utils/helpers');

router.get('/', asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('order name').lean();
  const counts = await Article.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json({ categories: categories.map((c) => ({ ...c, articleCount: map[String(c._id)] || 0 })) });
}));

const rules = [
  body('name').trim().isLength({ min: 2, max: 40 }).withMessage('श्रेणी का नाम 2–40 अक्षर का होना चाहिए।'),
  body('nameHi').optional().isLength({ max: 40 }).withMessage('हिंदी नाम बहुत लंबा है।'),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('रंग इस तरह होना चाहिए: #FFC400'),
  body('order').optional().isInt({ min: 0, max: 999 }).withMessage('क्रम एक संख्या होनी चाहिए।'),
];

router.post('/', protect, restrictTo('admin'), rules, validate, asyncHandler(async (req, res) => {
  const name = stripHtml(req.body.name);
  const category = await Category.create({ ...req.body, name, slug: slugify(name) });
  res.status(201).json({ category });
}));

router.put('/:id', protect, restrictTo('admin'), validId(), rules, validate, asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'श्रेणी नहीं मिली।');
  const name = stripHtml(req.body.name);
  Object.assign(category, { ...req.body, name, slug: slugify(name) });
  await category.save();
  res.json({ category });
}));

router.delete('/:id', protect, restrictTo('admin'), validId(), asyncHandler(async (req, res) => {
  const used = await Article.countDocuments({ category: req.params.id });
  if (used) throw new ApiError(400, `इस श्रेणी में ${used} खबरें हैं। पहले उन्हें दूसरी श्रेणी में ले जाइए या हटाइए।`);
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'श्रेणी हटा दी गई।' });
}));

module.exports = router;
