const Article = require('../models/Article');
const Visit = require('../models/Visit');
const { slugify, cleanHtml, stripHtml, readingTime } = require('./helpers');
const { emit } = require('./realtime');

const LIST_SELECT = '-content -likes';
const populateList = [
  { path: 'category', select: 'name nameHi slug color' },
  { path: 'author', select: 'name avatar' },
];

const publicFilter = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

// Generates a unique slug: "my-title", "my-title-2", ...
async function uniqueSlug(title, ignoreId) {
  const base = slugify(title).slice(0, 80);
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Article.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const parseTags = (tags) => {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 10);
  return String(tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
};

// Cleans and normalises user-supplied article fields.
function articleFields(body) {
  const f = {};
  if (body.title !== undefined) f.title = stripHtml(body.title).trim();
  if (body.summary !== undefined) f.summary = stripHtml(body.summary).trim();
  if (body.content !== undefined) {
    f.content = cleanHtml(body.content);
    f.readingTime = readingTime(f.content);
  }
  if (body.category !== undefined) f.category = body.category;
  if (body.tags !== undefined) f.tags = parseTags(body.tags);
  if (body.imageCaption !== undefined) f.imageCaption = stripHtml(body.imageCaption).trim();
  if (body.seoTitle !== undefined) f.seoTitle = stripHtml(body.seoTitle).trim().slice(0, 70);
  if (body.seoDescription !== undefined) f.seoDescription = stripHtml(body.seoDescription).trim().slice(0, 170);
  return f;
}

// Moves an article to "published" and tells every connected browser.
async function publish(article, { breaking } = {}) {
  article.status = 'published';
  article.rejectionReason = '';
  if (!article.publishedAt) article.publishedAt = new Date();
  if (breaking !== undefined) article.isBreaking = !!breaking;
  await article.save();
  await article.populate([{ path: 'category', select: 'name slug' }]);
  const payload = {
    _id: article._id,
    title: article.title,
    slug: article.slug,
    category: article.category && article.category.name,
    isBreaking: article.isBreaking,
  };
  emit('article:published', payload);
  if (article.isBreaking) emit('article:breaking', payload);
  return article;
}

const today = () => new Date().toISOString().slice(0, 10);
const trackView = (article) =>
  Promise.all([
    Article.updateOne({ _id: article._id }, { $inc: { views: 1 } }),
    Visit.updateOne({ day: today() }, { $inc: { views: 1 } }, { upsert: true }),
  ]).catch(() => {});

module.exports = {
  LIST_SELECT,
  populateList,
  publicFilter,
  uniqueSlug,
  articleFields,
  parseTags,
  publish,
  trackView,
};
