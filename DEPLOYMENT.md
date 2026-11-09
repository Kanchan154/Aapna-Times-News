# Deployment Guide — अपना टाइम्स न्यूज़ (Aapna Times News)

Pick **one** option. Option A is the easiest. All options need a MongoDB database (MongoDB Atlas free tier is fine).

## 0. Before you deploy (every option)

1. **Database:** create a MongoDB Atlas cluster and copy the `mongodb+srv://…/aapna_times` connection string (see README §4).
2. **Secrets:** generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
3. **Do not run `npm run seed` on a live database** — it wipes data. Create your first admin safely instead:
   ```bash
   cd server && node src/utils/createAdmin.js "Your Name" you@example.com "StrongPassword1"
   ```
   Then log in and create categories from *Dashboard → श्रेणियाँ*. For each one fill the English name (used in the URL, e.g. `Sports` → `/category/sports`) and the Hindi name (shown on the site, e.g. `खेल`). (You can run the seed once on a *test* database to see sample content.)
4. **Uploaded images** are stored on the server disk in `server/uploads/`. Hosts with temporary disks (Render free, Heroku, Railway without a volume) **delete these on every restart**. Attach a persistent disk/volume mounted at `server/uploads`, or move uploads to cloud storage (Cloudinary / S3) before relying on it.

---

## Option A — One service on Render + Atlas (simplest)

Express serves both the API and the built website, so there is only one thing to host.

1. Push the project to GitHub (`.env` is git-ignored, so secrets stay private).
2. Render → **New → Web Service** → connect the repo.
   * **Build command:** `npm run install:all && npm run build`
   * **Start command:** `npm start`
   * **Instance:** any plan. Add a **Disk** (paid) mounted at `/opt/render/project/src/server/uploads` if you want uploads to survive restarts.
3. **Environment variables:**

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your Atlas string |
   | `JWT_SECRET` | the long random value |
   | `CLIENT_URL` | `https://YOUR-SERVICE.onrender.com` (or your custom domain) |
   | `PUBLIC_URL` | the same address |
   | `NEWSAPI_KEY` | optional |

4. In Atlas → *Network Access*, allow Render's outgoing IPs (simplest: `0.0.0.0/0`, protected by your DB password).
5. Open the Render shell and run the `createAdmin` command from step 0.
6. Add your domain under *Settings → Custom Domains*; Render provides HTTPS automatically. Update `CLIENT_URL`/`PUBLIC_URL` to the final domain.

WebSockets (real-time) work on Render without extra setup. Railway and Fly.io work the same way (same build/start commands and variables).

---

## Option B — Frontend on Vercel/Netlify, API elsewhere

1. Deploy the **server** (Render/Railway) as in Option A, but build command is just `npm install --prefix server` and start command `npm start --prefix server`. Set `CLIENT_URL` to your frontend address (comma-separate several: `https://aapnatimes.com,https://www.aapnatimes.com`).
2. Deploy the **client**:
   * Root directory `client`, build command `npm run build`, output `dist`.
   * Environment variables: `VITE_API_URL=https://your-api.onrender.com` and `VITE_SITE_URL=https://aapnatimes.com`.
   * **SPA rewrite** so deep links work: Netlify → add `client/public/_redirects` containing `/* /index.html 200`; Vercel → add `client/vercel.json` containing `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
3. Social link previews (WhatsApp/Facebook) for article URLs rely on Express injecting tags (Option A). With a split deployment, either point your domain at the Express server (Option A), or use a prerender service. Search engines like Google still render the React app.
4. `sitemap.xml` and `rss.xml` are produced by the API; link to `https://your-api…/sitemap.xml` in Search Console or proxy those two paths from your frontend host.

---

## Option C — Your own VPS (Ubuntu) with Nginx + PM2

```bash
# Node 22, Nginx, PM2
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs nginx
sudo npm i -g pm2

git clone <your-repo> aapna-times && cd aapna-times
npm run install:all
cp server/.env.example server/.env && nano server/.env     # fill values, NODE_ENV=production
npm run build
node server/src/utils/createAdmin.js "Your Name" you@example.com "StrongPassword1"

pm2 start server/src/server.js --name aapna-times
pm2 save && pm2 startup
```

`/etc/nginx/sites-available/aapnatimes`:
```nginx
server {
  server_name aapnatimes.com www.aapnatimes.com;
  client_max_body_size 5m;                     # image uploads

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;     # WebSockets (real-time)
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/aapnatimes /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d aapnatimes.com -d www.aapnatimes.com
```
Uploads live in `server/uploads/` on the VPS disk — include it in backups.
Update later with: `git pull && npm run install:all && npm run build && pm2 restart aapna-times`.

---

## Option D — Docker

```bash
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
docker compose up --build -d
docker compose exec app node server/src/utils/createAdmin.js "Your Name" you@example.com "StrongPassword1"
```
This runs MongoDB and the app together on port 5000 with persistent volumes for the database and uploads. For production, put it behind HTTPS (Caddy, Nginx or your cloud load balancer) and prefer a managed MongoDB. *(The Docker files were written to standard practice but were not built in the environment where this project was created.)*

---

## After going live — checklist

- [ ] `JWT_SECRET` is long and private; default demo passwords are gone (or demo users deleted).
- [ ] Site is on **HTTPS** and `CLIENT_URL` / `PUBLIC_URL` match the real address exactly (no trailing slash needed).
- [ ] MongoDB backups enabled (Atlas has them on paid tiers; otherwise schedule `mongodump`).
- [ ] Uploads persist across restarts (disk/volume or cloud storage).
- [ ] Submit `https://yourdomain/sitemap.xml` in Google Search Console.
- [ ] Create categories, publish a few real stories, then test: register → like → comment → reporter submit → admin approve.
- [ ] Optional: set `NEWSAPI_KEY`, and wire an email provider if you want to send the newsletter.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Cannot reach the server" in the browser | API not running, or `VITE_API_URL` wrong (split deployment) |
| Login works but you are logged out on refresh | `JWT_SECRET` changed, or cookies/localStorage blocked |
| CORS error in the console | Add the exact frontend origin to `CLIENT_URL` and restart |
| Real-time updates don't arrive | Reverse proxy not forwarding WebSocket headers (see Nginx block) |
| Images vanish after a restart | Ephemeral disk — add a persistent volume or cloud storage |
| `MongoServerSelectionError` | Wrong `MONGO_URI` or Atlas Network Access blocks your host |
| "Too many requests" | Rate limit (login: 20 per 15 min per IP). Adjust `AUTH_RATE_LIMIT` |
