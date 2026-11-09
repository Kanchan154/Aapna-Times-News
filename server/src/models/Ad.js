const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    link: { type: String, required: true },
    placement: { type: String, enum: ['header', 'sidebar', 'inline', 'footer'], default: 'sidebar' },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ad', adSchema);
