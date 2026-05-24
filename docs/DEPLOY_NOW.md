# ArchDefend — Complete Deployment Guide
## From zero to live in one session

---

## WHAT YOU NEED BEFORE STARTING

- [ ] Phone/laptop with internet
- [ ] GitHub account (github.com)
- [ ] Email address
- [ ] Your NOWPayments credentials (you already have these)

**Time needed: ~45 minutes**

---

## STEP 1 — PUSH CODE TO GITHUB (5 min)

1. Go to **github.com** → click **New repository**
2. Name it: `archdefend`
3. Set to **Private** → click **Create repository**
4. On your computer, unzip the project and run:

```bash
cd archdefend
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/ememzyvisuals/archdefend.git
git push -u origin main
```

---

## STEP 2 — SUPABASE (database) — FREE (10 min)

1. Go to **supabase.com** → Sign up with GitHub
2. Click **New project**
   - Name: `archdefend`
   - Database password: create a strong one, **save it**
   - Region: pick closest to you (US East or EU)
3. Wait ~2 minutes for it to provision
4. Go to **Project Settings** (gear icon) → **Database**
5. Scroll to **Connection string** → click **URI** tab
6. Copy the string — it looks like:
   ```
   postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
   **Replace `[YOUR-PASSWORD]` with your actual password**
   Add `postgresql+asyncpg://` at the start instead of `postgresql://`

7. Go to **Project Settings** → **API**
8. Copy these two values:
   - **Project URL**: `https://xxxx.supabase.co`
   - **service_role** key (the long one under "Service role") — keep this secret

9. Go to **Database** → **Extensions** → search `vector` → **Enable**

**Save these:**
```
DATABASE_URL=postgresql+asyncpg://postgres.xxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...long key...
```

---

## STEP 3 — UPSTASH REDIS (cache) — FREE (3 min)

1. Go to **upstash.com** → Sign up with GitHub
2. Click **Create database**
   - Name: `archdefend`
   - Type: **Regional**
   - Region: same as Supabase
3. Click **Create**
4. Scroll down to **REST API** section
5. Copy the **Redis URL** — looks like:
   ```
   redis://default:AXxx...@us1-xxx.upstash.io:6379
   ```

**Save this:**
```
REDIS_URL=redis://default:PASSWORD@us1-xxx.upstash.io:6379
```

---

## STEP 4 — GROQ API KEY (AI) — FREE (2 min)

1. Go to **console.groq.com** → Sign up
2. Click **API Keys** → **Create API Key**
3. Name it `archdefend` → click **Submit**
4. Copy the key immediately (shown once)
   Starts with: `gsk_...`

**Save this:**
```
GROQ_API_KEY=gsk_xxxx...
```

---

## STEP 5 — GITHUB OAUTH APP (login with GitHub) (5 min)

1. Go to **github.com/settings/developers**
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - Application name: `ArchDefend`
   - Homepage URL: `https://archdefend.vercel.app`
   - Authorization callback URL: `https://archdefend.vercel.app/api/v1/auth/github/callback`
4. Click **Register application**
5. Copy **Client ID**
6. Click **Generate a new client secret** → copy it immediately

**Save these:**
```
GITHUB_CLIENT_ID=Iv1.xxxx...
GITHUB_CLIENT_SECRET=xxxx...
GITHUB_CALLBACK_URL=https://archdefend.vercel.app/api/v1/auth/github/callback
```

---

## STEP 6 — NOWPAYMENTS (you already have this)

From your screenshots, your credentials are:

```
NOWPAYMENTS_API_KEY=C8XSM8W-KA2MZ1Q-QY2MGWS-VBM78CP
NOWPAYMENTS_IPN_SECRET=xGWS/Fll7r0O4U/9H3HZ87s4f9VOKL8a
```

**Set the webhook URL in NOWPayments dashboard:**
1. Go to **account.nowpayments.io/store-settings**
2. Click **Instant payment notifications** tab
3. In **Webhook URL** field, enter:
   ```
   https://archdefend-api.onrender.com/api/v1/billing/webhook/nowpayments
   ```
4. Click **Save webhook URL**
5. Confirm webhook format is set to **Classic way**

---

## STEP 7 — DEPLOY BACKEND ON RENDER — FREE (10 min)

Render will host your FastAPI backend for free.

1. Go to **render.com** → Sign up with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo → select `archdefend`
4. Fill in:
   - **Name**: `archdefend-api`
   - **Root directory**: `apps/api`
   - **Runtime**: `Python 3`
   - **Build command**:
     ```
     pip install -r requirements.txt
     ```
   - **Start command**:
     ```
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance type**: **Free**

5. Scroll to **Environment Variables** → click **Add Environment Variable**
   Add ALL of these one by one:

```
ENVIRONMENT                = production
SECRET_KEY                 = (generate: openssl rand -hex 32)
JWT_SECRET                 = (generate: openssl rand -hex 32)
DATABASE_URL               = (from Step 2)
SUPABASE_URL               = (from Step 2)
SUPABASE_SERVICE_KEY       = (from Step 2)
REDIS_URL                  = (from Step 3)
GROQ_API_KEY               = (from Step 4)
GITHUB_CLIENT_ID           = (from Step 5)
GITHUB_CLIENT_SECRET       = (from Step 5)
GITHUB_CALLBACK_URL        = https://archdefend-api.onrender.com/api/v1/auth/github/callback
NOWPAYMENTS_API_KEY        = C8XSM8W-KA2MZ1Q-QY2MGWS-VBM78CP
NOWPAYMENTS_IPN_SECRET     = xGWS/Fll7r0O4U/9H3HZ87s4f9VOKL8a
NOWPAYMENTS_BASE_URL       = https://api.nowpayments.io/v1
ALLOWED_HOSTS              = ["archdefend-api.onrender.com","archdefend.vercel.app"]
CORS_ORIGINS               = ["https://archdefend.vercel.app","https://archdefend-api.onrender.com"]
TEMP_CLONE_DIR             = /tmp/archdefend/repos
MAX_REPO_SIZE_MB           = 200
CLONE_TIMEOUT_SECONDS      = 120
FREE_TIER_CREDITS          = 20
SMALL_REPO_CREDITS         = 5
MEDIUM_REPO_CREDITS        = 15
LARGE_REPO_CREDITS         = 40
PPTX_EXPORT_CREDITS        = 5
SECURITY_SCAN_CREDITS      = 15
```

6. Click **Create Web Service**
7. Wait for it to build (~3–5 minutes)
8. Your API URL will be: `https://archdefend-api.onrender.com`

**Run database migrations — IMPORTANT:**
After deploy succeeds, click **Shell** in the Render dashboard and run:
```bash
alembic upgrade head
```

---

## STEP 8 — DEPLOY FRONTEND ON VERCEL (5 min)

1. Go to **vercel.com** → Sign up with GitHub
2. Click **Add New Project**
3. Import your `archdefend` repository
4. Configure:
   - **Root directory**: `apps/web`
   - **Framework preset**: Next.js (auto-detected)
   - **Build command**: `pnpm install && pnpm build`
   - **Output directory**: `.next`

5. Expand **Environment Variables** → add these:

```
NEXT_PUBLIC_APP_URL        = https://archdefend.vercel.app
NEXT_PUBLIC_API_URL        = https://archdefend-api.onrender.com
```

6. Click **Deploy**
7. Wait ~2 minutes → your site is live at `https://archdefend.vercel.app`

---

## STEP 9 — UPDATE URLS EVERYWHERE (2 min)

Now that you have your real Vercel URL, update:

**On Render** — update these env vars:
```
CORS_ORIGINS = ["https://archdefend.vercel.app"]
GITHUB_CALLBACK_URL = https://archdefend-api.onrender.com/api/v1/auth/github/callback
```

**On GitHub OAuth App** (github.com/settings/developers):
- Homepage URL: `https://archdefend.vercel.app`
- Callback URL: `https://archdefend-api.onrender.com/api/v1/auth/github/callback`

**On NOWPayments** (account.nowpayments.io/store-settings):
- Webhook URL: `https://archdefend-api.onrender.com/api/v1/billing/webhook/nowpayments`

---

## STEP 10 — VERIFY IT WORKS (3 min)

Open these URLs and confirm they return data:

```
https://archdefend-api.onrender.com/api/v1/health
→ Should return: {"status":"operational"}

https://archdefend.vercel.app
→ Should show the landing page

https://archdefend.vercel.app/sitemap.xml
→ Should show your sitemap

https://archdefend.vercel.app/robots.txt
→ Should show crawl rules
```

---

## STEP 11 — GOOGLE SEARCH CONSOLE (5 min)

1. Go to **search.google.com/search-console** → sign in
2. Click **Add property** → **URL prefix**
3. Enter: `https://archdefend.vercel.app`
4. Choose **HTML tag** verification
5. Copy the `content` value from the meta tag they show you
6. In Vercel → your project → **Settings** → **Environment Variables** → add:
   ```
   NEXT_PUBLIC_GOOGLE_VERIFICATION = paste-your-code-here
   ```
7. Redeploy: Vercel dashboard → **Deployments** → **Redeploy**
8. Back in Search Console → click **Verify**
9. Go to **Sitemaps** → enter:
   ```
   https://archdefend.vercel.app/sitemap.xml
   ```
10. Click **Submit**

---

## SECRET KEY GENERATOR

Run this in any terminal (Mac/Linux) or use an online tool:

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -hex 32
```

Or use: **randomkeygen.com** → copy a "256-bit WEP Key"

---

## ALL ENV VARIABLES SUMMARY

### Render (Backend)
| Variable | Value |
|----------|-------|
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | generate with openssl |
| `JWT_SECRET` | generate with openssl |
| `DATABASE_URL` | from Supabase Step 2 |
| `SUPABASE_URL` | from Supabase Step 2 |
| `SUPABASE_SERVICE_KEY` | from Supabase Step 2 |
| `REDIS_URL` | from Upstash Step 3 |
| `GROQ_API_KEY` | from Groq Step 4 |
| `GITHUB_CLIENT_ID` | from Step 5 |
| `GITHUB_CLIENT_SECRET` | from Step 5 |
| `GITHUB_CALLBACK_URL` | `https://archdefend-api.onrender.com/api/v1/auth/github/callback` |
| `NOWPAYMENTS_API_KEY` | `C8XSM8W-KA2MZ1Q-QY2MGWS-VBM78CP` |
| `NOWPAYMENTS_IPN_SECRET` | `xGWS/Fll7r0O4U/9H3HZ87s4f9VOKL8a` |
| `NOWPAYMENTS_BASE_URL` | `https://api.nowpayments.io/v1` |
| `ALLOWED_HOSTS` | `["archdefend-api.onrender.com","archdefend.vercel.app"]` |
| `CORS_ORIGINS` | `["https://archdefend.vercel.app"]` |
| `TEMP_CLONE_DIR` | `/tmp/archdefend/repos` |
| `MAX_REPO_SIZE_MB` | `200` |
| `FREE_TIER_CREDITS` | `20` |
| `SMALL_REPO_CREDITS` | `5` |
| `MEDIUM_REPO_CREDITS` | `15` |
| `LARGE_REPO_CREDITS` | `40` |
| `PPTX_EXPORT_CREDITS` | `5` |
| `SECURITY_SCAN_CREDITS` | `15` |

### Vercel (Frontend)
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://archdefend.vercel.app` |
| `NEXT_PUBLIC_API_URL` | `https://archdefend-api.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | from Google Search Console |

---

## TROUBLESHOOTING

**Build fails on Vercel:**
TypeScript errors are already disabled in `next.config.mjs`. If it still fails, check the build log and share the exact error.

**API returns 500:**
Go to Render → your service → **Logs** tab. Look for Python error. Most common: forgot to run `alembic upgrade head`.

**GitHub OAuth not working:**
Double-check the callback URL matches exactly in both GitHub OAuth app settings and your Render env var. No trailing slash.

**Payments not activating credits:**
Check Render logs for IPN webhook received. Make sure NOWPayments webhook URL is set and matches your Render URL exactly.

**Free tier Render sleeps:**
Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) to keep it always-on.

---

## QUICK REFERENCE — ALL DASHBOARDS

| Service | URL |
|---------|-----|
| Vercel (frontend) | vercel.com/dashboard |
| Render (backend) | dashboard.render.com |
| Supabase (database) | app.supabase.com |
| Upstash (Redis) | console.upstash.com |
| Groq (AI) | console.groq.com |
| NOWPayments | account.nowpayments.io |
| Google Search Console | search.google.com/search-console |
| GitHub OAuth Apps | github.com/settings/developers |

---

*EMEMZYVISUALS DIGITALS · ArchDefend*
