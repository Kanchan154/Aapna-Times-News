const router = require('express').Router();
const Ad = require('../models/Ad');
const { validId } = require('../middleware/validate');
const { asyncHandler } = require('../utils/helpers');

// Public: active ads for a placement (within their date window).
router.get('/', asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
    ],
  };
  if (req.query.placement) filter.placement = req.query.placement;
  const ads = await Ad.find(filter).select('-impressions -clicks').limit(5).lean();
  if (ads.length) await Ad.updateMany({ _id: { $in: ads.map((a) => a._id) } }, { $inc: { impressions: 1 } });
  res.json({ ads });
}));

router.post('/:id/click', validId(), asyncHandler(async (req, res) => {
  await Ad.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } });
  res.json({ ok: true });
}));

module.exports = router;
