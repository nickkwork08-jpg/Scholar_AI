# Deploy (Full-stack)

This guide shows how to deploy the full-stack app (Vite frontend + Express backend) so the same service serves the built frontend and the API.

---

## 🔧 Prerequisites

- Node.js environment supported by your host (14+ recommended)
- Git repo connected to the hosting provider (Render, Railway, etc.)
- MongoDB (MongoDB Atlas recommended)
- Email account credentials (Gmail or SMTP) for sending OTP emails
- Any API keys (e.g., `GEMINI_API_KEY`) set as environment variables

> Note: The repo already includes a production-ready static serve block in `server.js` and a `start` script in `package.json`.

---

## Environment variables (required)

- `PORT` (optional; provider usually sets this)
- `NODE_ENV=production`
- `MONGODB_URI` (Mongo connection string)
- `MONGODB_DB_NAME` (optional)
- `MONGODB_USER_COLLECTION` (optional)
- `EMAIL_USER` (SMTP username)
- `EMAIL_PASS` (SMTP password)
- `GEMINI_API_KEY` (if using AI proxy)

Keep these in the provider's environment settings — do NOT commit them to git.

---

## Render (recommended)

1. Create a new **Web Service** and connect your Git repo.
2. In the service settings:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Set all required env vars listed above.
   - **Region & Plan:** Choose as needed.
3. Deploy. Render will run `npm run build` to generate `dist` and then `npm start` to run `node server.js`.

### ✅ Render quick checklist

- Push your repo to GitHub (e.g. `git add . && git commit -m "deploy config" && git push origin main`).
- In Render service **Environment**, set **required** env vars:
  - `NODE_ENV=production`
  - `MONGODB_URI` (Atlas connection string)
  - `EMAIL_USER` and `EMAIL_PASS` (SMTP creds)
  - `GEMINI_API_KEY` (optional)
- Set **Health Check Path** to `/api/health` (Service → Settings → Health Check).
- Use **Manual Deploy** or push to trigger auto-deploy; check **Logs** to verify build and server start.
- If you prefer Render to use Node (not Docker): set **Build Command:** `npm run build` and **Start Command:** `npm start`.

4. Add your domain in Render, enable TLS (automatic), and update any CORS origins in `server.js` if needed.

---

## Railway

1. Create a new project and connect the Git repo.
2. Set **Build Command** to `npm run build` and **Start Command** to `npm start`.
3. Add environment variables (use Railway dashboard). Add Mongo as a managed plugin or point to Atlas.
4. Deploy and verify logs. Configure a custom domain if required.

---

## MongoDB Atlas (quick)

1. Create a free cluster on Atlas.
2. Create a database user and collect the connection string (replace password and DB name).
3. Add your host/app IP addresses to the network access (or allow 0.0.0.0/0 for convenience during testing).
4. Set `MONGODB_URI` in your provider to the Atlas connection string.

---

## CORS & Production notes

- `server.js` currently allows dev origins when `NODE_ENV !== 'production'`. When deploying, add your production domain(s) to the CORS list or set `origin: true` if you want to allow all origins (not recommended).
- Ensure `NODE_ENV=production` so static files in `dist` are served and the catch-all route returns `dist/index.html`.

---

## Local verification (before deploying)

1. Install deps: `npm install`
2. Build frontend: `npm run build`
3. Start server in production mode: `NODE_ENV=production npm start` (or on Windows PowerShell: `$env:NODE_ENV='production'; npm start`)
4. Visit `http://localhost:5000` and confirm the app loads and API routes (e.g. `GET /api/health`) work.

---

## Optional: Docker (local test + Render)

A multistage `Dockerfile` is included in the repository for production builds (smaller, repeatable images). Use the steps below to build and run locally for verification or push to a Docker-capable host like Render or Fly.

Build locally:

```bash
# Build the image locally
docker build -t scholar-ai:local .
```

Run locally (required env vars for production mode):

```bash
# In production NODE_ENV the server requires EMAIL_USER and EMAIL_PASS (it will exit if missing).
# Provide at least EMAIL_USER and EMAIL_PASS; add MONGODB_URI if you want real DB connectivity.
docker run --rm -p 5000:5000 \
  -e NODE_ENV=production \
  -e EMAIL_USER="you@example.com" \
  -e EMAIL_PASS="supersecret" \
  -e MONGODB_URI="mongodb+srv://..." \
  scholar-ai:local
```

Quick checks after starting the container:

```bash
# Should return the app HTML
curl http://localhost:5000/
# Should return JSON with mongoState/mongoConnected info
curl http://localhost:5000/api/health
```

Using Render (one-click with `render.yaml`):

- A `render.yaml` manifest is included in the repo that instructs Render to build the Docker image using the `Dockerfile` and auto-deploy.
- Push your repo to GitHub, connect it to Render, and let Render detect the `render.yaml` file.
- In Render dashboard, set required secret env vars (`MONGODB_URI`, `EMAIL_USER`, `EMAIL_PASS`, `GEMINI_API_KEY`, etc.) — **do not** put secrets in the manifest.

Notes:

- The Docker image uses `NODE_ENV=production` by default; the server will exit on startup if `EMAIL_USER`/`EMAIL_PASS` are missing when `NODE_ENV=production`.
- If you don't want to use a real Mongo for quick tests, omit `MONGODB_URI` and the server will fallback to in-memory users (it logs a warning).

---

## Common pitfalls & troubleshooting

- Large bundle warnings from Vite: consider code-splitting if total JS is large.
- Email sending fails: ensure `EMAIL_USER`/`EMAIL_PASS` are correct and Gmail less-secure settings or app passwords are configured.
- CORS errors: add your production origin to the CORS list in `server.js`.
- Missing `GEMINI_API_KEY`: `/api/ai/generate` will return `Gemini key missing`.

---

## TL;DR checklist ✅

- [ ] Set env vars in host
- [ ] Build (`npm run build`) during CI/build step
- [ ] Start with `npm start` (server serves `dist`)
- [ ] Point domain and configure TLS
- [ ] Verify endpoints and UI

---

If you'd like, I can also add a `Dockerfile` and a short `render.yaml` (or `railway` settings) for one-click deploys — tell me which provider you prefer and I'll add it.
