// End-to-end API test. Run with the server up:  npm run seed && npm start   (other terminal)  npm test
const { io } = require('socket.io-client');
const BASE = process.env.API_URL || 'http://localhost:5000';
let pass = 0, fail = 0;
const results = [];

const api = async (method, url, { token, json, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  const res = await fetch(BASE + url, { method, headers, body });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; results.push(`  PASS  ${name}`); } else { fail += 1; results.push(`  FAIL  ${name} ${extra}`); }
};
const login = async (email, password) => (await api('POST', '/api/auth/login', { json: { email, password } })).data;
const png = () => new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')], { type: 'image/png' });

(async () => {
  const stamp = Date.now();

  // ---- Public ----
  let r = await api('GET', '/api/health'); check('health endpoint', r.status === 200);
  r = await api('GET', '/api/categories');
  check('7 categories returned with counts', r.data.categories.length === 7 && r.data.categories.every((c) => 'articleCount' in c));
  const sports = r.data.categories.find((c) => c.name === 'Sports');
  r = await api('GET', '/api/articles/home');
  check('home bundle: featured, breaking, trending, latest, sections', ['featured', 'breaking', 'trending', 'latest', 'sections'].every((k) => r.data[k] && r.data[k].length > 0));
  check('home never exposes unpublished or full content', r.data.latest.every((a) => a.status === 'published' && a.content === undefined));
  r = await api('GET', '/api/articles?limit=5&page=2'); check('pagination (page 2 of limit 5)', r.data.articles.length === 5 && r.data.page === 2 && r.data.pages >= 5);
  r = await api('GET', '/api/articles?category=sports'); check('category filter', r.data.total >= 3 && r.data.articles.every((a) => a.category.slug === 'sports'));
  r = await api('GET', '/api/articles?q=' + encodeURIComponent('क्रिकेट')); check('search by Hindi keyword (tag/title/body)', r.data.total >= 1);
  r = await api('GET', '/api/articles?q=' + encodeURIComponent('मौसम')); check('Hindi search works', r.data.total >= 1);
  r = await api('GET', '/api/articles?q=.*'); check('regex characters in search are escaped', r.data.total === 0);
  r = await api('GET', '/api/articles?sort=popular&limit=3'); check('sort by popular', r.data.articles[0].views >= r.data.articles[1].views);
  r = await api('GET', '/api/articles/suggest?q=' + encodeURIComponent('शीतलहर')); check('search suggestions', r.data.suggestions.length >= 1);
  r = await api('GET', '/api/articles/breaking'); check('breaking-news list', r.data.articles.length >= 2 && r.data.articles.every((a) => a.isBreaking));
  r = await api('GET', '/api/articles/trending'); check('trending list', r.data.articles.length >= 5);
  const slug = (await api('GET', '/api/articles?q=' + encodeURIComponent('आख़िरी ओवर') + '&limit=1')).data.articles[0]?.slug || (await api('GET', '/api/articles?limit=1')).data.articles[0].slug;
  const before = (await api('GET', `/api/articles/${encodeURIComponent(slug)}`)).data.article;
  await new Promise((r2) => setTimeout(r2, 300)); // view counter is written asynchronously
  const after = (await api('GET', `/api/articles/${encodeURIComponent(slug)}`)).data.article;
  check('article detail has content and increments views', before.content && after.views === before.views + 1);
  r = await api('GET', `/api/articles/${encodeURIComponent(slug)}/related`); check('related articles', r.data.articles.length >= 1);
  r = await api('GET', '/api/articles/does-not-exist'); check('unknown article -> 404', r.status === 404);
  r = await api('GET', '/api/ads?placement=sidebar'); check('public ads by placement', r.data.ads.length >= 1 && r.data.ads.every((a) => a.placement === 'sidebar'));
  r = await api('GET', '/sitemap.xml'); check('sitemap.xml', r.status === 200 && String(r.data).includes('<urlset'));
  r = await api('GET', '/rss.xml'); check('rss.xml', r.status === 200 && String(r.data).includes('<rss'));

  // ---- Auth ----
  const email = `tester${stamp}@example.com`;
  r = await api('POST', '/api/auth/register', { json: { name: 'T', email: 'bad', password: '123' } }); check('register validation rejects bad input (422)', r.status === 422);
  r = await api('POST', '/api/auth/register', { json: { name: 'Test Reader', email, password: 'Passw0rd!x', role: 'admin' } });
  check('register succeeds and ignores injected role=admin', r.status === 201 && r.data.user.role === 'reader' && !r.data.user.password);
  const readerToken = r.data.token;
  r = await api('POST', '/api/auth/register', { json: { name: 'Test Reader', email, password: 'Passw0rd!x' } }); check('duplicate email -> 409', r.status === 409);
  r = await api('POST', '/api/auth/login', { json: { email, password: 'wrong-pass1' } }); check('wrong password -> 401', r.status === 401);
  r = await api('POST', '/api/auth/login', { json: { email: { $gt: '' }, password: { $gt: '' } } }); check('NoSQL-injection login blocked', r.status >= 400 && r.status < 500);
  r = await api('GET', '/api/auth/me', { token: readerToken }); check('GET /me with token', r.status === 200 && r.data.user.email === email);
  r = await api('GET', '/api/auth/me'); check('GET /me without token -> 401', r.status === 401);
  r = await api('PUT', '/api/auth/me', { token: readerToken, json: { name: 'Test Reader Updated', city: 'Almora', interests: [sports._id] } }); check('profile update', r.status === 200 && r.data.user.city === 'Almora');
  let f = new FormData(); f.append('avatar', png(), 'a.png');
  r = await api('POST', '/api/auth/me/avatar', { token: readerToken, form: f }); check('avatar upload', r.status === 200 && r.data.user.avatar.startsWith('/uploads/'));
  const up = await fetch(BASE + r.data.user.avatar); check('uploaded avatar is served', up.status === 200);
  f = new FormData(); f.append('avatar', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'x.html');
  r = await api('POST', '/api/auth/me/avatar', { token: readerToken, form: f }); check('non-image upload rejected', r.status === 400);
  r = await api('PUT', '/api/auth/me/password', { token: readerToken, json: { currentPassword: 'nope', password: 'Another1pass' } }); check('password change needs correct current password', r.status === 400);
  r = await api('POST', '/api/auth/me/request-reporter', { token: readerToken }); check('reader can request reporter role', r.status === 200 && r.data.user.reporterRequest === 'pending');

  // ---- Reader features ----
  const art = (await api('GET', '/api/articles?category=sports&limit=1')).data.articles[0];
  r = await api('POST', `/api/articles/${art._id}/like`); check('like requires login', r.status === 401);
  r = await api('POST', `/api/articles/${art._id}/like`, { token: readerToken }); const c1 = r.data.likesCount; check('like article', r.data.liked === true);
  r = await api('POST', `/api/articles/${art._id}/like`, { token: readerToken }); check('unlike article', r.data.liked === false && r.data.likesCount === c1 - 1);
  r = await api('POST', `/api/articles/${art._id}/bookmark`, { token: readerToken }); check('bookmark article', r.data.bookmarked === true);
  r = await api('GET', '/api/articles/bookmarks', { token: readerToken }); check('bookmarks list', r.data.articles.some((a) => a._id === art._id));
  r = await api('GET', `/api/articles/${encodeURIComponent(art.slug)}`, { token: readerToken }); check('detail flags bookmarked for this user', r.data.article.bookmarked === true);
  r = await api('GET', '/api/articles/feed', { token: readerToken }); check('personalised feed uses interests (Sports only)', r.data.personalized && r.data.articles.every((a) => a.category.slug === 'sports'));
  r = await api('POST', `/api/comments/article/${art._id}`, { token: readerToken, json: { text: 'x' } }); check('comment validation', r.status === 422);
  r = await api('POST', `/api/comments/article/${art._id}`, { token: readerToken, json: { text: '<b>Great</b> report!' } }); const cm = r.data.comment; check('post comment (HTML stripped)', r.status === 201 && cm.text === 'Great report!');
  r = await api('GET', `/api/comments/article/${art._id}`); check('list comments', r.data.comments.some((c) => c._id === cm._id));
  check('article commentsCount updated', (await api('GET', `/api/articles/${encodeURIComponent(art.slug)}`)).data.article.commentsCount >= 1);
  r = await api('POST', '/api/newsletter/subscribe', { json: { email: `news${stamp}@example.com` } }); check('newsletter subscribe', r.status === 201);
  r = await api('POST', '/api/newsletter/subscribe', { json: { email: `news${stamp}@example.com` } }); check('newsletter duplicate handled', r.data.message.includes('पहले से'));
  r = await api('POST', '/api/newsletter/unsubscribe', { json: { email: `news${stamp}@example.com` } }); check('newsletter unsubscribe', r.status === 200);

  // ---- Role-based access ----
  r = await api('GET', '/api/reporter/articles', { token: readerToken }); check('reader blocked from reporter area (403)', r.status === 403);
  r = await api('GET', '/api/admin/stats', { token: readerToken }); check('reader blocked from admin area (403)', r.status === 403);
  const riya = await login('riya@aapnatimes.com', 'Reporter@123');
  r = await api('GET', '/api/admin/stats', { token: riya.token }); check('reporter blocked from admin area (403)', r.status === 403);

  // ---- Reporter -> Admin workflow ----
  const admin = await login('admin@aapnatimes.com', 'Admin@12345');
  check('seed logins work for admin and reporter', !!admin.token && !!riya.token);
  const techCat = (await api('GET', '/api/categories')).data.categories.find((c) => c.name === 'Technology')._id;
  const mkForm = (title, submit) => {
    const fd = new FormData();
    fd.append('title', title); fd.append('summary', 'A test summary that is long enough to pass validation rules.');
    fd.append('content', '<p>This is the body of the test article. It has more than fifty characters so that validation passes.</p><script>alert(1)</script>');
    fd.append('category', techCat); fd.append('tags', 'test, Automation'); fd.append('submit', submit);
    fd.append('coverImage', png(), 'cover.png');
    return fd;
  };
  r = await api('POST', '/api/reporter/articles', { token: riya.token, form: mkForm('Short', 'false') }); check('article validation (title too short)', r.status === 422);
  r = await api('POST', '/api/reporter/articles', { token: riya.token, form: mkForm(`Automated test story ${stamp}`, 'false') });
  const draft = r.data.article; check('reporter saves draft with cover image', r.status === 201 && draft.status === 'draft' && draft.coverImage.startsWith('/uploads/'));
  check('script tags are stripped from body, tags normalised', !draft.content.includes('<script') && draft.tags.includes('automation'));
  r = await api('GET', `/api/articles/${draft.slug}`); check('draft is NOT public', r.status === 404);
  r = await api('GET', `/api/articles/${draft.slug}`, { token: riya.token }); check('author can preview own draft', r.status === 200);
  r = await api('POST', `/api/reporter/articles/${draft._id}/submit`, { token: riya.token }); check('submit for approval -> pending', r.data.article.status === 'pending');
  r = await api('POST', `/api/admin/articles/${draft._id}/approve`, { token: riya.token }); check('reporter cannot approve own article', r.status === 403);
  const sock = io(BASE, { auth: { token: admin.token }, transports: ['websocket'] });
  const live = new Promise((resolve) => { sock.on('article:published', resolve); setTimeout(() => resolve(null), 4000); });
  await new Promise((res) => sock.on('connect', res));
  r = await api('POST', `/api/admin/articles/${draft._id}/approve`, { token: admin.token }); check('admin approves -> published', r.data.article.status === 'published');
  const evt = await live; check('real-time: article:published pushed over socket', evt && evt.slug === draft.slug); sock.close();
  r = await api('GET', `/api/articles/${draft.slug}`); check('approved article is now public', r.status === 200);
  r = await api('PUT', `/api/reporter/articles/${draft._id}`, { token: riya.token, form: mkForm('Edited headline after publish', 'false') }); check('reporter cannot edit published article', r.status === 403);
  r = await api('PUT', `/api/admin/articles/${draft._id}/flags`, { token: admin.token, json: { isBreaking: true, isFeatured: true } }); check('admin sets breaking + featured', r.data.article.isBreaking && r.data.article.isFeatured);
  r = await api('POST', '/api/reporter/articles', { token: riya.token, form: mkForm(`Story to reject ${stamp}`, 'true') });
  const rej = r.data.article; check('submit on create -> pending', rej.status === 'pending');
  r = await api('POST', `/api/admin/articles/${rej._id}/reject`, { token: admin.token, json: { reason: '' } }); check('reject requires a reason', r.status === 422);
  r = await api('POST', `/api/admin/articles/${rej._id}/reject`, { token: admin.token, json: { reason: 'Please add sources.' } }); check('admin rejects with reason', r.data.article.status === 'rejected');
  r = await api('GET', `/api/reporter/articles/${rej._id}`, { token: riya.token }); check('reporter sees rejection reason', r.data.article.rejectionReason === 'Please add sources.');
  r = await api('GET', '/api/reporter/stats', { token: riya.token }); check('reporter stats', r.data.total >= 3 && r.data.rejected >= 1);
  r = await api('DELETE', `/api/reporter/articles/${rej._id}`, { token: riya.token }); check('reporter deletes own unpublished article', r.status === 200);
  const arjun = await login('arjun@aapnatimes.com', 'Reporter@123');
  r = await api('GET', `/api/reporter/articles/${draft._id}`, { token: arjun.token }); check("reporter cannot open another reporter's article", r.status === 403);

  // ---- Admin ----
  r = await api('GET', '/api/admin/stats', { token: admin.token }); check('admin analytics', r.data.users.total >= 6 && r.data.viewsByDay.length === 14 && r.data.byCategory.length === 7 && r.data.topArticles.length === 5);
  r = await api('GET', '/api/admin/articles?status=pending', { token: admin.token }); check('admin pending queue', r.data.articles.length >= 2 && r.data.articles.every((a) => a.status === 'pending'));
  r = await api('GET', '/api/admin/users?q=tester', { token: admin.token }); const tu = r.data.users.find((u) => u.email === email); check('admin user search', !!tu);
  r = await api('PUT', `/api/admin/users/${tu._id}`, { token: admin.token, json: { role: 'reporter' } }); check('admin promotes reader to reporter', r.data.user.role === 'reporter' && r.data.user.reporterRequest === 'none');
  r = await api('GET', '/api/reporter/stats', { token: readerToken }); check('promotion takes effect immediately', r.status === 200);
  r = await api('PUT', `/api/admin/users/${tu._id}`, { token: admin.token, json: { isActive: false } }); check('admin deactivates user', r.data.user.isActive === false);
  r = await api('GET', '/api/auth/me', { token: readerToken }); check('deactivated user is locked out (403)', r.status === 403);
  r = await api('DELETE', `/api/admin/users/${tu._id}`, { token: admin.token }); check('admin deletes user', r.status === 200, JSON.stringify(r.data));
  r = await api('PUT', `/api/admin/users/${admin.user._id}`, { token: admin.token, json: { role: 'reader' } }); check('admin cannot demote self', r.status === 400);
  r = await api('POST', '/api/categories', { token: admin.token, json: { name: `Test Cat ${stamp}`, color: '#112233' } }); const cat = r.data.category; check('admin creates category', r.status === 201 && !!cat.slug);
  r = await api('PUT', `/api/categories/${cat._id}`, { token: admin.token, json: { name: `Test Cat B ${stamp}`, color: '#445566' } }); check('admin edits category', r.data.category.name.includes('Cat B'));
  r = await api('DELETE', `/api/categories/${techCat}`, { token: admin.token }); check('cannot delete category that has articles', r.status === 400);
  r = await api('DELETE', `/api/categories/${cat._id}`, { token: admin.token }); check('admin deletes empty category', r.status === 200);
  r = await api('GET', '/api/admin/comments', { token: admin.token }); const adminCm = r.data.comments.find((c) => c._id === cm._id) || r.data.comments[0]; check('admin lists comments', r.data.comments.length > 0);
  r = await api('PUT', `/api/admin/comments/${adminCm._id}/toggle`, { token: admin.token }); check('admin hides comment', r.data.comment.status === 'hidden');
  r = await api('PUT', `/api/admin/comments/${adminCm._id}/toggle`, { token: admin.token }); check('admin unhides comment', r.data.comment.status === 'visible');
  f = new FormData(); f.append('title', 'Test Ad'); f.append('link', 'https://example.com'); f.append('placement', 'footer'); f.append('image', png(), 'ad.png');
  r = await api('POST', '/api/admin/ads', { token: admin.token, form: f }); const ad = r.data.ad; check('admin creates ad with image', r.status === 201 && ad.placement === 'footer');
  r = await api('GET', '/api/ads?placement=footer'); check('new ad is served publicly', r.data.ads.some((a) => a._id === ad._id));
  r = await api('POST', `/api/ads/${ad._id}/click`); check('ad click tracked', r.status === 200);
  r = await api('PUT', `/api/admin/ads/${ad._id}/toggle`, { token: admin.token }); check('admin pauses ad', r.data.ad.isActive === false);
  r = await api('GET', '/api/ads?placement=footer'); check('paused ad no longer served', !r.data.ads.some((a) => a._id === ad._id));
  r = await api('DELETE', `/api/admin/ads/${ad._id}`, { token: admin.token }); check('admin deletes ad', r.status === 200);
  r = await api('GET', '/api/admin/subscribers', { token: admin.token }); check('admin lists subscribers', r.data.total >= 2);
  r = await api('POST', '/api/admin/articles/' + draft._id + '/unpublish', { token: admin.token }); check('admin unpublishes article', r.data.article.status === 'draft');
  r = await api('DELETE', `/api/reporter/articles/${draft._id}`, { token: admin.token }); check('admin deletes any article', r.status === 200);
  r = await api('GET', '/api/external/headlines', { token: admin.token }); check('external news: clear message when NEWSAPI_KEY missing/valid', r.status === 503 || r.status === 200 || r.status === 502);
  r = await api('GET', '/api/articles/%7B%22%24ne%22%3Anull%7D'); check('weird slug handled', r.status === 404);
  r = await api('GET', '/api/admin/users/not-an-id', { token: admin.token }); check('unknown route under /api -> 404 JSON', r.status === 404 && typeof r.data === 'object');

  console.log(results.join('\n'));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(results.join('\n')); console.error('Test crashed:', e); process.exit(1); });
