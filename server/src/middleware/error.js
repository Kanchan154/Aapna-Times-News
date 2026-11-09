const multer = require('multer');

const notFound = (req, res) => res.status(404).json({ message: `यह पता नहीं मिला: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'कुछ गड़बड़ हो गई।';
  let details = err.details;

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'फ़ोटो बहुत बड़ी है। अधिकतम 3 MB।' : err.message;
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 422;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0].message;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `यह ${field} पहले से इस्तेमाल में है।`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'गलत मान दिया गया।';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'भेजा गया डेटा सही नहीं है।';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'कुछ गड़बड़ हो गई।' : message,
    ...(details ? { details } : {}),
  });
};

module.exports = { notFound, errorHandler };
