// Create (or promote) an admin WITHOUT touching any other data. Safe for production.
//   node src/utils/createAdmin.js "Your Name" you@example.com "StrongPass123"
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password || password.length < 8) {
    console.error('Usage: node src/utils/createAdmin.js "Full Name" email@example.com "Password(8+ chars)"');
    process.exit(1);
  }
  await connectDB();
  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) { user.role = 'admin'; user.isActive = true; user.password = password; user.name = name; }
  else user = new User({ name, email, password, role: 'admin' });
  await user.save();
  console.log(`Admin ready: ${user.email}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
