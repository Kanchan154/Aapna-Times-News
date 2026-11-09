require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Ad = require('../models/Ad');
const Subscriber = require('../models/Subscriber');
const Visit = require('../models/Visit');
const { slugify, readingTime } = require('./helpers');
const data = require('./seedData');

const UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const motif = (cat, i) => {
  const k = (i * 37) % 100;
  switch (cat) {
    case 'Sports': return `<circle cx="${820 + k}" cy="330" r="260" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="22"/><circle cx="${820 + k}" cy="330" r="150" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="22"/><circle cx="${820 + k}" cy="330" r="50" fill="#fff" fill-opacity=".3"/>`;
    case 'Technology': return [...Array(8)].map((_, r) => `<path d="M${500 + r * 20} ${80 + r * 70}H${760 + k}V${120 + r * 70}H1200" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="6"/><circle cx="${760 + k}" cy="${100 + r * 70}" r="10" fill="#fff" fill-opacity=".5"/>`).join('');
    case 'Business': return [...Array(7)].map((_, b) => `<rect x="${640 + b * 76}" y="${480 - (b + 2) * 42 - (k % 30)}" width="52" height="${(b + 2) * 42 + (k % 30)}" fill="#fff" fill-opacity="${0.14 + b * 0.04}"/>`).join('');
    case 'Politics': return [...Array(6)].map((_, c) => `<rect x="${600 + c * 90}" y="190" width="44" height="300" fill="#fff" fill-opacity=".16"/>`).join('') + `<path d="M570 190L880 60L1190 190Z" fill="#fff" fill-opacity=".2"/>`;
    case 'Education': return [...Array(5)].map((_, b) => `<rect x="${620 + b * 20}" y="${120 + b * 90}" width="${440 - b * 30}" height="64" rx="8" fill="#fff" fill-opacity="${0.12 + b * 0.05}"/>`).join('');
    case 'Entertainment': return [...Array(9)].map((_, r) => `<path d="M900 -40L${300 + r * 120} 700" stroke="#fff" stroke-opacity=".12" stroke-width="34"/>`).join('') + `<circle cx="900" cy="120" r="70" fill="#fff" fill-opacity=".3"/>`;
    default: return `<circle cx="${930 + k}" cy="170" r="90" fill="#FFD166" fill-opacity=".85"/><ellipse cx="760" cy="400" rx="190" ry="62" fill="#fff" fill-opacity=".28"/><ellipse cx="900" cy="360" rx="150" ry="70" fill="#fff" fill-opacity=".34"/><ellipse cx="1040" cy="410" rx="170" ry="58" fill="#fff" fill-opacity=".26"/>`;
  }
};
const cover = (name, cat, color, i) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#111111"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/>${motif(cat, i)}</svg>`;
  fs.writeFileSync(path.join(UPLOADS, name), svg);
  return `/uploads/${name}`;
};
const banner = (name, text, sub, c1, c2, wide) => {
  const H = wide ? 220 : 500;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wide ? 1200 : 600} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="1200" height="500" fill="url(#g)"/><text x="40" y="${wide ? 100 : 230}" font-family="Mukta, Noto Sans Devanagari, sans-serif" font-size="54" font-weight="700" fill="#fff">${text}</text><text x="40" y="${wide ? 150 : 290}" font-family="Mukta, Noto Sans Devanagari, sans-serif" font-size="26" fill="#fff" fill-opacity=".9">${sub}</text><text x="40" y="${wide ? 200 : 440}" font-family="Mukta, Noto Sans Devanagari, sans-serif" font-size="16" fill="#fff" fill-opacity=".7">नमूना विज्ञापन</text></svg>`;
  fs.writeFileSync(path.join(UPLOADS, name), svg);
  return `/uploads/${name}`;
};

(async () => {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to wipe a production database. Re-run with --force if you really mean it.');
    process.exit(1);
  }
  await connectDB();
  fs.mkdirSync(UPLOADS, { recursive: true });
  fs.readdirSync(UPLOADS).filter((f) => f.startsWith('seed-')).forEach((f) => fs.unlinkSync(path.join(UPLOADS, f)));
  await Promise.all([User, Category, Article, Comment, Ad, Subscriber, Visit].map((m) => m.deleteMany({})));

  const cats = {};
  for (const [i, c] of data.categories.entries()) cats[c.name] = await Category.create({ ...c, slug: slugify(c.name), order: i });

  const users = {};
  const mk = async (key, name, email, password, role, extra = {}) => { users[key] = await User.create({ name, email, password, role, ...extra }); };
  await mk('admin', 'अपना टाइम्स संपादक', process.env.ADMIN_EMAIL || 'admin@aapnatimes.com', process.env.ADMIN_PASSWORD || 'Admin@12345', 'admin', { bio: 'अपना टाइम्स न्यूज़ के मुख्य संपादक।' });
  await mk('riya', 'रिया शर्मा', 'riya@aapnatimes.com', 'Reporter@123', 'reporter', { bio: 'राजनीति, तकनीक और मौसम कवर करने वाली वरिष्ठ रिपोर्टर।', city: 'अल्मोड़ा' });
  await mk('arjun', 'अर्जुन मेहता', 'arjun@aapnatimes.com', 'Reporter@123', 'reporter', { bio: 'खेल और कारोबार संवाददाता।', city: 'देहरादून' });
  await mk('neha', 'नेहा वर्मा', 'reader@aapnatimes.com', 'Reader@123', 'reader', { city: 'हल्द्वानी', interests: [cats.Education._id, cats.Technology._id, cats.Weather._id] });
  await mk('karan', 'करण सिंह', 'karan@aapnatimes.com', 'Reader@123', 'reader', { city: 'नैनीताल', interests: [cats.Sports._id, cats.Entertainment._id], reporterRequest: 'pending' });

  const created = [];
  for (const [i, a] of data.articles.entries()) {
    const [cat, title, summary, paras, tags, flags, hoursAgo, views, author] = a;
    const content = paras.map((p) => `<p>${p}</p>`).join('');
    const likes = [users.neha._id, users.karan._id].slice(0, i % 3);
    created.push(await Article.create({
      title, summary, content, slug: slugify(title).slice(0, 80) + (slugify(title).length < 3 ? `-${i}` : ''),
      category: cats[cat]._id, tags, author: users[author]._id, status: 'published',
      isBreaking: !!flags.breaking, isFeatured: !!flags.featured, views, likes, likesCount: likes.length,
      readingTime: readingTime(content), coverImage: cover(`seed-${i}.svg`, cat, cats[cat].color, i),
      imageCaption: 'प्रतीकात्मक तस्वीर', source: 'अपना टाइम्स डेस्क',
      publishedAt: new Date(Date.now() - hoursAgo * 3600000),
    }));
  }
  for (const [i, w] of data.workflow.entries()) {
    await Article.create({
      title: w.title, summary: w.summary, content: w.content, slug: slugify(w.title).slice(0, 80), category: cats[w.category]._id,
      tags: w.tags, author: users[w.author]._id, status: w.status, rejectionReason: w.reason || '',
      readingTime: readingTime(w.content), coverImage: cover(`seed-w${i}.svg`, w.category, cats[w.category].color, i + 40),
    });
  }
  for (const [idx, who, text] of data.comments) await Comment.create({ article: created[idx]._id, user: users[who]._id, text });
  for (const a of created) await Article.updateOne({ _id: a._id }, { commentsCount: await Comment.countDocuments({ article: a._id }) });

  await Ad.create([
    { title: 'अपना बैंक – ज़ीरो फ़ीस बचत खाता', image: banner('seed-ad1.svg', 'अपना बैंक', 'ज़ीरो फ़ीस बचत खाता', '#0F766E', '#134E4A'), link: 'https://example.com/aapna-bank', placement: 'sidebar' },
    { title: 'सीखो-फ़ास्ट – ऑनलाइन कोर्स', image: banner('seed-ad2.svg', 'सीखो-फ़ास्ट', 'हिंदी और अंग्रेज़ी में कोर्स', '#7C3AED', '#3B0764'), link: 'https://example.com/learnfast', placement: 'sidebar' },
    { title: 'त्योहार सेल', image: banner('seed-ad3.svg', 'त्योहार सेल', 'इस हफ़्ते 40% तक की छूट', '#DC2626', '#7F1D1D', true), link: 'https://example.com/sale', placement: 'inline' },
  ]);
  await Subscriber.create([{ email: 'subscriber1@example.com' }, { email: 'subscriber2@example.com' }]);
  for (let d = 0; d < 14; d += 1) {
    await Visit.create({ day: new Date(Date.now() - d * 86400000).toISOString().slice(0, 10), views: 400 + ((d * 173) % 600) });
  }

  console.log(`\nSeed complete: ${data.categories.length} categories, ${Object.keys(users).length} users, ${created.length + data.workflow.length} articles.`);
  console.log('\nLogin accounts:');
  console.log(`  Admin    ${process.env.ADMIN_EMAIL || 'admin@aapnatimes.com'} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
  console.log('  Reporter riya@aapnatimes.com / Reporter@123   (also arjun@aapnatimes.com)');
  console.log('  Reader   reader@aapnatimes.com / Reader@123   (also karan@aapnatimes.com)\n');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
