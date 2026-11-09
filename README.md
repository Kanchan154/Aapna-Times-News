# अपना टाइम्स न्यूज़ (Aapna Times News) — Hindi News Portal

A **Hindi-first** news channel website in the spirit of modern digital newsrooms like The Lallantop: bold, youthful, conversational. The whole interface (public site, reader features, reporter and admin dashboards, even API error messages) is in Hindi, with Devanagari-friendly typography. Black-and-yellow identity with a red breaking-news ticker. The logo, colours and name are original to this project.

It has a public reader site and three role-based dashboards (Reader, Reporter, Admin).
Everything is wired to a real MongoDB database. There is no mock data in the code; sample content is created by a seed script you can run or skip.

**Stack:** React 18 + Vite · Tailwind CSS · Node.js + Express · MongoDB (Mongoose) · Socket.io · JWT

> English first, **Hindi (हिंदी) below** → [jump to Hindi](#हिंदी-में-समझिए)

---

## 1. What you get

| Area | Features |
|---|---|
| **Public site** | Homepage (featured lead, latest, trending, per-category sections), live breaking-news ticker, search with suggestions, 7 categories shown in Hindi (राजनीति, खेल, तकनीक, कारोबार, शिक्षा, मनोरंजन, मौसम), article pages with related stories, live weather widget, newsletter signup, ad slots, RSS + sitemap |
| **Reader** | Register / login, profile + photo, choose interests, **personalised "For you" feed**, like, bookmark, comment, share, request reporter access |
| **Reporter** | Rich-text editor with image upload, drafts, **submit for admin approval**, see rejection feedback, personal stats, optional NewsAPI story leads |
| **Admin** | Approve / reject articles, mark **featured** or **breaking**, manage users & roles (approve reporter requests, deactivate), categories, comments moderation, advertisements (with impressions/clicks), newsletter subscribers (CSV export), **analytics dashboard** |
| **Real-time** | New and breaking stories appear instantly on readers' screens; new comments appear live; reporters are notified when an article is approved/rejected; admins are notified of new submissions |
| **Security** | bcrypt passwords, JWT auth, role-based access on every route, input validation, HTML sanitising, NoSQL-injection protection, Helmet, CORS, rate limiting, upload type/size checks |
| **SEO** | Page titles & meta tags, Open Graph + JSON-LD (NewsArticle), server-rendered link-preview tags for article URLs, `sitemap.xml`, `rss.xml`, `robots.txt` |

## 2. Quick start (local)

**Requirements:** Node.js 18+ (22 recommended) and MongoDB (local install **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1) Install everything
npm run install:all

# 2) Configure the server
cp server/.env.example server/.env
#    then open server/.env and set MONGO_URI and JWT_SECRET (see section 4)

# 3) Load sample data (WARNING: wipes the database it points to)
npm run seed

# 4) Start the API (terminal 1)           -> http://localhost:5000
npm run dev:server

# 5) Start the website (terminal 2)       -> http://localhost:5173
npm run dev:client
```

Open **http://localhost:5173**.

### Demo accounts (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@aapnatimes.com` | `Admin@12345` |
| Reporter | `riya@aapnatimes.com` / `arjun@aapnatimes.com` | `Reporter@123` |
| Reader | `reader@aapnatimes.com` / `karan@aapnatimes.com` | `Reader@123` |

Change these before going live. The seed also creates: 7 categories, 24 published **Hindi** stories, 4 workflow examples (2 pending, 1 rejected, 1 draft), comments, 3 ads, subscribers and 14 days of view history.

### Try the workflow (2 minutes)
1. Log in as **Riya (reporter)** → *Write article* → *Submit for approval*.
2. In another browser/incognito, log in as **Admin** → *Articles & review* → the story is waiting (you get a live alert). Click **Approve**.
3. Open the home page as a reader: the new story appears **without refreshing**, and Riya receives a notification.

### One-server mode (production style)
```bash
npm run build      # builds the React app into client/dist
npm start          # Express now serves the API *and* the website on :5000
```

## 3. Folder structure

```
aapna-times/
├── package.json            Handy root scripts (install:all, seed, build, start)
├── Dockerfile, docker-compose.yml   Optional container setup
├── DEPLOYMENT.md           Step-by-step hosting guide
├── server/                 ── Backend (Node + Express + MongoDB)
│   ├── .env.example        All settings, documented
│   ├── uploads/            Uploaded images (cover photos, avatars, ads)
│   └── src/
│       ├── server.js       Starts HTTP + Socket.io + DB connection
│       ├── app.js          Middleware (security, CORS, limits) + route mounting
│       ├── config/db.js    MongoDB connection
│       ├── models/         User, Article, Category, Comment, Ad, Subscriber, Visit
│       ├── middleware/     auth (JWT + roles), validate, upload (multer), error handler
│       ├── routes/         auth, articles (public), reporter, admin, comments,
│       │                   categories, ads, newsletter, misc (upload, RSS, sitemap, NewsAPI)
│       └── utils/          helpers, articleService, realtime (Socket.io),
│                           seed.js + seedData.js, createAdmin.js, smoke-test.js
└── client/                 ── Frontend (React + Vite + Tailwind)
    ├── index.html, vite.config.js, tailwind.config.js
    └── src/
        ├── main.jsx, App.jsx        Providers and routes
        ├── lib/                     api (axios), format helpers
        ├── context/                 Auth, Toast, Socket (real-time)
        ├── hooks/                   useFetch, categories
        ├── components/              Layout, ArticleCard, Ticker, SearchBar, WeatherWidget,
        │                            Comments, RichEditor, AdSlot, NewsletterBox, ui kit, Seo
        └── pages/                   Home, Category, Search, ArticleDetail, Auth, Personal
            └── dashboard/           Overview, Profile, MyArticles, ArticleEditor
                └── admin/           Review, Users, Categories, CommentsAdmin, Ads, Subscribers
```

## 4. Configuration & API keys

All server settings live in `server/.env` (copy from `.env.example`).

| Variable | Required | What to put |
|---|---|---|
| `MONGO_URI` | **Yes** | Local: `mongodb://127.0.0.1:27017/aapna_times`. Atlas: see below |
| `JWT_SECRET` | **Yes** | Long random text. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | Yes | Website address(es) allowed to call the API (comma-separated). Dev: `http://localhost:5173` |
| `PUBLIC_URL` | Recommended | Public website URL, used in sitemap/RSS/link previews |
| `PORT` | No | Default `5000` |
| `NEWSAPI_KEY` | No (optional) | Enables "Story leads" in the reporter editor |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No | Admin created by `npm run seed` |

**MongoDB Atlas (free):** create an account → *Create cluster* (M0 free) → *Database Access*: add a user + password → *Network Access*: allow your IP (or `0.0.0.0/0` for hosting) → *Connect → Drivers* → copy the `mongodb+srv://…` string, put your password in it and add `/aapna_times` before the `?`.

**NewsAPI (optional):** sign up free at <https://newsapi.org>, copy the API key, set `NEWSAPI_KEY=...`, restart the server. The free plan is for development only; check their terms before using it commercially. Without a key the editor panel simply explains that it isn't configured.

**Weather:** uses [Open-Meteo](https://open-meteo.com), which needs **no key**.

**Newsletter:** subscribers are stored and manageable (export CSV from the admin panel). *Sending* emails is intentionally not included because it needs your own email provider. To add it, plug `nodemailer` + any SMTP service (Brevo, SendGrid, Gmail SMTP) into a script that reads `Subscriber` where `isActive: true`.

## 5. Roles & permissions

| Action | Reader | Reporter | Admin |
|---|:-:|:-:|:-:|
| Read, search, like, bookmark, comment | ✓ | ✓ | ✓ |
| Write articles (go to **pending**) | – | ✓ | ✓ (publishes directly) |
| Edit own unpublished articles | – | ✓ | ✓ (any article) |
| Approve / reject / feature / breaking | – | – | ✓ |
| Manage users, categories, comments, ads, subscribers, analytics | – | – | ✓ |

Roles are enforced **on the server** for every request. Hiding a button in the UI is never the only protection. New sign-ups are always readers; the role cannot be chosen at registration.

## 6. Testing

```bash
# API: 97 automated checks against a running server + seeded database
npm run seed && npm run dev:server     # terminal 1
npm test                                # terminal 2
```
The suite covers public endpoints, validation, auth, injection attempts, uploads, likes/bookmarks/comments, role isolation, the whole reporter→admin approval workflow, moderation, ads, newsletter, sitemap/RSS and Socket.io events.
Browser test (optional): `pip install playwright && playwright install chromium && python tests/e2e_browser.py` drives the real UI as reader, reporter and admin.
Note: login/register are rate-limited to 20 attempts / 15 min / IP. If you re-run tests many times in a row, restart the server or raise `AUTH_RATE_LIMIT`.

### What was verified when this was built
* API test suite: **97 / 97 passed**.
* Browser (Chromium) end-to-end run of the real Hindi UI: **28 / 28 passed** — reader login, like/bookmark/comment, search, category, feed; reporter writing and submitting with a cover image; admin review, approve, reject; live updates in a second browser; role redirects; mobile layout without horizontal scroll.
* **Compatibility fix found by testing:** newer Chromium makes `window.scrollTo()` return a Promise, which crashed React when used as an effect return value. This is fixed in `Layout.jsx`.
* **Honest limits:** the build sandbox had no real `mongod`, so tests ran against **FerretDB** (an open-source MongoDB-compatible server). The code avoids features FerretDB lacks, so it should behave identically on MongoDB, but run `npm test` once against your own MongoDB. The sandbox also blocked outside websites, so the **Google Fonts, Open-Meteo weather and NewsAPI** calls could not be exercised there; they are standard calls but please check them on your machine. The Dockerfile has not been built in this environment.

## 7. Design notes
Black and a strong yellow for a youthful news-channel feel; red is used **only** for breaking news. Headlines and body use **Mukta** (Devanagari + Latin), loaded from Google Fonts, with Noto Sans Devanagari as a fallback. Dates, relative times ("2 घंटे पहले") and numbers use Hindi locale formats. Changing the look is mostly in `client/tailwind.config.js`.

**Hindi content tips:** each category has an English `name` (used for the URL, e.g. `/category/sports`) and a Hindi `nameHi` (shown on the site) — fill both in *Dashboard → श्रेणियाँ*. Article URLs use the Hindi headline as the slug, which works in all modern browsers. All screen text lives directly in the `.jsx` files, so to change wording just edit it there.

## 8. Next steps you may want
Email sending for the newsletter · cloud image storage (Cloudinary/S3) if your host has no persistent disk · a rich "live blog" format · push notifications · full-text search service (Atlas Search/Meilisearch) for very large archives.

---

# हिंदी में समझिए

## यह प्रोजेक्ट क्या है?
**Aapna Times** एक पूरा न्यूज़ पोर्टल है। इसमें पाठक (Reader), रिपोर्टर (Reporter) और एडमिन (Admin) के अलग-अलग डैशबोर्ड हैं। सारा डेटा असली MongoDB डेटाबेस में सेव होता है।

## इस्तेमाल हुई तकनीकें (Technologies)
| तकनीक | काम |
|---|---|
| **React.js** | वेबसाइट का सामने वाला हिस्सा (पेज, बटन, फ़ॉर्म) |
| **Tailwind CSS** | सुंदर और मोबाइल-फ्रेंडली डिज़ाइन |
| **Node.js + Express.js** | बैकएंड सर्वर, जो डेटा देता और सेव करता है |
| **MongoDB** | डेटाबेस: खबरें, यूज़र, कमेंट आदि यहाँ रहते हैं |
| **Socket.io** | रियल-टाइम अपडेट, यानी बिना रिफ्रेश किए नई खबर दिखना |
| **JWT + bcrypt** | सुरक्षित लॉगिन और पासवर्ड सुरक्षा |

## फ़ोल्डर का ढाँचा
* `server/` : बैकएंड। `models/` में डेटा के ढाँचे, `routes/` में API, `middleware/` में सुरक्षा और लॉगिन की जाँच, `utils/` में सहायक फ़ाइलें और सैंपल डेटा (`seed.js`)।
* `client/` : फ्रंटएंड। `pages/` में पेज, `components/` में बार-बार इस्तेमाल होने वाले हिस्से (कार्ड, टिकर, सर्च), `context/` में लॉगिन/सूचना/रियल-टाइम की स्थिति।
* `.env` : गुप्त सेटिंग (डेटाबेस का पता, सीक्रेट की)। इसे **कभी** GitHub पर न डालें।

## कैसे चलाएँ (आसान तरीके से)
1. कंप्यूटर में **Node.js** और **MongoDB** (या मुफ़्त MongoDB Atlas) रखें।
2. टर्मिनल में: `npm run install:all`
3. `server/.env.example` को कॉपी करके `server/.env` बनाएँ। उसमें `MONGO_URI` और `JWT_SECRET` भरें।
4. सैंपल डेटा के लिए: `npm run seed` (ध्यान दें: यह डेटाबेस का पुराना डेटा मिटा देता है)।
5. एक टर्मिनल में `npm run dev:server` और दूसरे में `npm run dev:client` चलाएँ।
6. ब्राउज़र में खोलें: **http://localhost:5173**

## काम कैसे चलता है (Workflow)
1. **पाठक** रजिस्टर करता है, खबरें पढ़ता है, लाइक/बुकमार्क/कमेंट करता है और अपनी पसंद की श्रेणियाँ चुनता है, जिससे उसका "For you" फ़ीड बनता है।
2. **रिपोर्टर** एडिटर में खबर लिखता है, फोटो लगाता है और **"Submit for approval"** दबाता है। खबर अभी जनता को नहीं दिखती (स्थिति: *pending*)।
3. **एडमिन** "Articles & review" में खबर देखता है और **Approve** या **Reject** (कारण के साथ) करता है।
4. Approve होते ही खबर वेबसाइट पर **तुरंत** दिख जाती है और रिपोर्टर को सूचना मिलती है। Reject होने पर रिपोर्टर को एडमिन की टिप्पणी दिखती है और वह सुधारकर दोबारा भेज सकता है।
5. एडमिन किसी खबर को **Featured** (होमपेज पर बड़ी) या **Breaking** (ऊपर लाल पट्टी में चलने वाली) बना सकता है।

## API कुंजियाँ (Keys) कहाँ से लें
* **MongoDB Atlas (मुफ़्त):** atlas.mongodb.com पर खाता बनाएँ, मुफ़्त क्लस्टर बनाएँ, यूज़र और पासवर्ड जोड़ें, "Network Access" में अपना IP जोड़ें, फिर "Connect → Drivers" से `mongodb+srv://...` लिंक कॉपी करके `MONGO_URI` में डालें।
* **NewsAPI (वैकल्पिक):** newsapi.org पर मुफ़्त खाता बनाएँ और कुंजी `NEWSAPI_KEY` में डालें। इसके बिना भी सब कुछ चलता है।
* **मौसम:** Open-Meteo इस्तेमाल होता है, इसके लिए **कोई कुंजी नहीं** चाहिए।

## ज़रूरी सावधानियाँ
* लाइव करने से पहले डेमो पासवर्ड ज़रूर बदलें और `JWT_SECRET` लंबा और गुप्त रखें।
* लाइव सर्वर पर पहला एडमिन बनाने के लिए (डेटा मिटाए बिना): `npm run create-admin --prefix server -- "आपका नाम" you@example.com "मज़बूतPassword1"`
* होस्टिंग के तरीके के लिए **DEPLOYMENT.md** पढ़ें।
