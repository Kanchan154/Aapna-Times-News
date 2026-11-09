const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 400 },
    content: { type: String, required: true },
    coverImage: { type: String, default: '' },
    imageCaption: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    isBreaking: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    readingTime: { type: Number, default: 1 },
    seoTitle: { type: String, default: '' },
    seoDescription: { type: String, default: '' },
    source: { type: String, default: '' },
    publishedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, views: -1 });

module.exports = mongoose.model('Article', articleSchema);
