const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/helpers');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const readToken = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

// Requires a valid token. Always re-loads the user so role changes / bans apply instantly.
const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'आगे बढ़ने के लिए लॉग इन कीजिए।');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'आपका सत्र खत्म हो गया है। कृपया फिर से लॉग इन कीजिए।');
  }
  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'यह खाता अब मौजूद नहीं है।');
  if (!user.isActive) throw new ApiError(403, 'यह खाता बंद कर दिया गया है।');
  req.user = user;
  next();
});

// Adds req.user if a valid token is present, otherwise continues anonymously.
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (user && user.isActive) req.user = user;
    } catch {
      /* ignore – treated as anonymous */
    }
  }
  next();
});

const restrictTo = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'आपको यह करने की अनुमति नहीं है।'));
  }
  next();
};

module.exports = { signToken, protect, optionalAuth, restrictTo };
