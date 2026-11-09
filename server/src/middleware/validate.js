const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { ApiError } = require('../utils/helpers');

const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(422, details[0].message, details));
};

// Rejects malformed ObjectIds before they reach Mongoose.
const validId = (param = 'id') => (req, _res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) return next(new ApiError(400, 'गलत आईडी।'));
  next();
};

module.exports = { validate, validId };
