const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['reader', 'reporter', 'admin'], default: 'reader' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 400 },
    city: { type: String, default: '', maxlength: 60 },
    interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
    isActive: { type: Boolean, default: true },
    // A reader may ask to become a reporter; admin approves.
    reporterRequest: { type: String, enum: ['none', 'pending', 'rejected'], default: 'none' },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafe = function () {
  const o = this.toObject();
  delete o.password;
  delete o.__v;
  return o;
};

module.exports = mongoose.model('User', userSchema);
