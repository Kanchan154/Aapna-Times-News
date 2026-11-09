const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { ApiError } = require('../utils/helpers');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  // Extension comes from the verified mime-type, never from the user's filename.
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new ApiError(400, 'सिर्फ़ JPG, PNG, WEBP या GIF फ़ोटो चलेगी।')),
});

const fileUrl = (file) => (file ? `/uploads/${file.filename}` : undefined);

const removeFile = (url) => {
  if (!url || !url.startsWith('/uploads/')) return;
  fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
};

module.exports = { upload, fileUrl, removeFile, UPLOAD_DIR };
