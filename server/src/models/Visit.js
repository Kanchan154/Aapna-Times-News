const mongoose = require('mongoose');

// One document per day, incremented on each article view.
const visitSchema = new mongoose.Schema({
  day: { type: String, required: true, unique: true }, // YYYY-MM-DD
  views: { type: Number, default: 0 },
});

module.exports = mongoose.model('Visit', visitSchema);
