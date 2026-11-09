const router = require('express').Router();
const { body } = require('express-validator');
const Subscriber = require('../models/Subscriber');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/helpers');

const emailRule = [body('email').trim().isEmail().withMessage('सही ईमेल पता लिखिए।').normalizeEmail()];

router.post('/subscribe', emailRule, validate, asyncHandler(async (req, res) => {
  const existing = await Subscriber.findOne({ email: req.body.email });
  if (existing && existing.isActive) return res.json({ message: 'आप पहले से सब्सक्राइब हैं।' });
  if (existing) {
    existing.isActive = true;
    await existing.save();
  } else {
    await Subscriber.create({ email: req.body.email });
  }
  res.status(201).json({ message: 'सब्सक्राइब हो गया! अब आपको रोज़ की डाइजेस्ट मिलेगी।' });
}));

router.post('/unsubscribe', emailRule, validate, asyncHandler(async (req, res) => {
  await Subscriber.updateOne({ email: req.body.email }, { isActive: false });
  res.json({ message: 'आपका सब्सक्रिप्शन बंद कर दिया गया।' });
}));

module.exports = router;
