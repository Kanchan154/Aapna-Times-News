const router = require('express').Router();
const { body } = require('express-validator');
const User = require('../models/User');
const { signToken, protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload, fileUrl, removeFile } = require('../middleware/upload');
const { ApiError, asyncHandler, stripHtml } = require('../utils/helpers');

const strongPassword = body('password')
  .isLength({ min: 8 }).withMessage('पासवर्ड कम से कम 8 अक्षर का होना चाहिए।')
  .matches(/[A-Za-z]/).withMessage('पासवर्ड में कम से कम एक अक्षर (A–Z) होना चाहिए।')
  .matches(/\d/).withMessage('पासवर्ड में कम से कम एक अंक होना चाहिए।');

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('अपना नाम लिखिए (2–80 अक्षर)।'),
    body('email').trim().isEmail().withMessage('सही ईमेल पता लिखिए।').normalizeEmail(),
    strongPassword,
  ],
  validate,
  asyncHandler(async (req, res) => {
    // Role is never taken from the request: everyone starts as a reader.
    const user = await User.create({ name: stripHtml(req.body.name), email: req.body.email, password: req.body.password });
    res.status(201).json({ token: signToken(user), user: user.toSafe() });
  })
);

router.post(
  '/login',
  [body('email').trim().isEmail().withMessage('सही ईमेल पता लिखिए।').normalizeEmail(), body('password').notEmpty().withMessage('अपना पासवर्ड लिखिए।')],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.matchPassword(req.body.password))) throw new ApiError(401, 'ईमेल या पासवर्ड गलत है।');
    if (!user.isActive) throw new ApiError(403, 'यह खाता बंद कर दिया गया है।');
    user.lastLogin = new Date();
    await user.save();
    res.json({ token: signToken(user), user: user.toSafe() });
  })
);

router.get('/me', protect, (req, res) => res.json({ user: req.user.toSafe() }));

router.put(
  '/me',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('नाम 2–80 अक्षर का होना चाहिए।'),
    body('bio').optional().isLength({ max: 400 }).withMessage('परिचय अधिकतम 400 अक्षर का हो सकता है।'),
    body('city').optional().isLength({ max: 60 }).withMessage('शहर का नाम अधिकतम 60 अक्षर का हो सकता है।'),
    body('interests').optional().isArray({ max: 10 }).withMessage('पसंद एक सूची होनी चाहिए।'),
    body('interests.*').optional().isMongoId().withMessage('पसंद में गलत श्रेणी है।'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, bio, city, interests } = req.body;
    if (name !== undefined) req.user.name = stripHtml(name);
    if (bio !== undefined) req.user.bio = stripHtml(bio);
    if (city !== undefined) req.user.city = stripHtml(city);
    if (interests !== undefined) req.user.interests = interests;
    await req.user.save();
    res.json({ user: req.user.toSafe() });
  })
);

router.post('/me/avatar', protect, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'कृपया एक फ़ोटो चुनिए।');
  removeFile(req.user.avatar);
  req.user.avatar = fileUrl(req.file);
  await req.user.save();
  res.json({ user: req.user.toSafe() });
}));

router.put(
  '/me/password',
  protect,
  [body('currentPassword').notEmpty().withMessage('मौजूदा पासवर्ड लिखिए।'), body('password').isLength({ min: 8 }).withMessage('नया पासवर्ड कम से कम 8 अक्षर का होना चाहिए।').matches(/\d/).withMessage('नए पासवर्ड में कम से कम एक अंक होना चाहिए।')],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(req.body.currentPassword))) throw new ApiError(400, 'मौजूदा पासवर्ड गलत है।');
    user.password = req.body.password;
    await user.save();
    res.json({ message: 'पासवर्ड बदल गया।', token: signToken(user) });
  })
);

router.post('/me/request-reporter', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'reader') throw new ApiError(400, 'आपके पास पहले से न्यूज़रूम का रोल है।');
  if (req.user.reporterRequest === 'pending') throw new ApiError(400, 'आपका अनुरोध पहले से लंबित है।');
  req.user.reporterRequest = 'pending';
  await req.user.save();
  res.json({ user: req.user.toSafe(), message: 'अनुरोध भेज दिया गया। एडमिन इसे देखेगा।' });
}));

module.exports = router;
