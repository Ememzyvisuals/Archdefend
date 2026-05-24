# ArchDefend — Founder Deployment Guide

> For: Emmanuel / @ememzyvisuals  
> Purpose: Complete, step-by-step guide to take ArchDefend from code to live production  

---

## Pre-flight Checklist

Before starting, collect these:

| Item | Where to get it | Status |
|------|----------------|--------|
| VPS (Ubuntu 22.04, 2+ CPU, 4+ GB RAM) | Hetzner / DigitalOcean / Vultr (~$6-12/mo) | ☐ |
| Domain name | Namecheap / Cloudflare | ☐ |
| Supabase project | supabase.com (free tier) | ☐ |
| Upstash Redis | upstash.com (free tier) | ☐ |
| Groq API key | console.groq.com (free) | ☐ |
| GitHub OAuth App | github.com/settings/developers | ☐ |
| OpenRouter key | openrouter.ai (optional fallback) | ☐ |
| NOWPayments account | nowpayments.io (for billing) | ☐ |

---

## Phase 1 — External Services (30 min)

### 1.1 Supabase

```
1. Go to https://supabase.com → New Project
2. Name: archdefend | Region: closest to your VPS
3. Settings → Database → Connection String → copy URI
   Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
4. Settings → API → copy "service_role" key (secret)
5. Database → Extensions → search "vector" → ENABLE
```

### 1.2 Upstash Redis

```
1. Go to https://upstash.com → Create Database
2. Name: archdefend-redis | Region: match VPS
3. Copy "Redis URL": redis://default:PASSWORD@ENDPOINT.upstash.io:6379
```

### 1.3 GitHub OAuth App

```
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Application name: ArchDefend
3. Homepage URL: https://your-domain.com
4. Callback URL: https://your-domain.com/api/v1/auth/github/callback
5. Copy Client ID and Client Secret
```

### 1.4 NOWPayments (for crypto billing)

```
1. Go to https://nowpayments.io → Create account
2. Dashboard → API Keys → Generate new key
3. Dashboard → IPN Settings → Set IPN URL: https://your-domain.com/api/v1/billing/webhook/nowpayments
4. Copy API Key and IPN Secret
```

---

## Phase 2 — Server Setup (20 min)

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Install Git
apt install git -y

# Install Certbot for SSL
apt install certbot -y

# Create non-root user (security best practice)
adduser archdefend
usermod -aG docker archdefend
su - archdefend

# Clone repository
git clone https://github.com/ememzyvisuals/archdefend
cd archdefend
```

---

## Phase 3 — Configuration (10 min)

```bash
# Copy and edit env file
cp .env.example .env
nano .env
```

Fill in every value:

```env
# Generate these with: openssl rand -hex 32
SECRET_KEY=<generated>
JWT_SECRET=<generated>

DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_KEY=eyJ...

REDIS_URL=redis://default:[pass]@[endpoint].upstash.io:6379

GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...   # optional but recommended

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://your-domain.com/api/v1/auth/github/callback

NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...

ENVIRONMENT=production
ALLOWED_HOSTS=["your-domain.com","www.your-domain.com"]
CORS_ORIGINS=["https://your-domain.com","https://www.your-domain.com"]
```

---

## Phase 4 — SSL Certificate (5 min)

```bash
# Point your domain DNS A record to your server IP first!
# Then run:
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certs to nginx directory
mkdir -p infrastructure/nginx/certs
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem infrastructure/nginx/certs/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem infrastructure/nginx/certs/
chmod 644 infrastructure/nginx/certs/*.pem

# Update nginx.conf — replace archdefend.io with your-domain.com
sed -i 's/archdefend.io/your-domain.com/g' infrastructure/nginx/nginx.conf
```

---

## Phase 5 — Launch Backend (10 min)

```bash
# Build and start all containers
docker compose up -d --build

# Check they're all healthy
docker compose ps

# Run database migrations
docker compose exec api alembic upgrade head

# Verify API is responding
curl https://your-domain.com/api/v1/health
# Expected: {"status":"operational","service":"ArchDefend API","version":"1.0.0"}

# Check deep health (database + redis)
curl https://your-domain.com/api/v1/health/deep
# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"}}

# View logs
docker compose logs -f api
```

---

## Phase 6 — Deploy Frontend to Vercel (10 min)

```bash
# Option A: Connect GitHub repo to Vercel (recommended)
# 1. Push code to GitHub: git push origin main
# 2. Go to vercel.com → Import Git Repository
# 3. Select: apps/web as root directory
# 4. Add environment variables:
#    NEXT_PUBLIC_API_URL = https://your-domain.com
#    NEXT_PUBLIC_APP_URL = https://your-domain.com

# Option B: Vercel CLI
npm install -g vercel
cd apps/web
vercel env add NEXT_PUBLIC_API_URL    # https://your-domain.com
vercel --prod
```

---

## Phase 7 — Verify End-to-End (10 min)

```bash
# 1. Visit your domain — landing page should load
# 2. Click "Get started" — signup should work
# 3. Sign in with GitHub — OAuth should redirect and login
# 4. Paste this URL in dashboard: https://github.com/tiangolo/fastapi
# 5. Click Analyze — should clone, parse, and show report in ~90s
# 6. Try PDF export — should download a PDF report
```

---

## Phase 8 — Auto-Renew SSL + Monitoring

```bash
# Auto-renew SSL every 60 days
crontab -e
# Add:
0 3 1 * * certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/your-domain.com/*.pem /home/archdefend/archdefend/infrastructure/nginx/certs/ && docker compose -f /home/archdefend/archdefend/docker-compose.yml restart nginx"

# Set up log rotation
cat > /etc/logrotate.d/archdefend << EOF
/home/archdefend/archdefend/logs/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
}
EOF
```

---

## Common Issues & Fixes

**"git clone failed: not found"**  
→ The repo is private. Set `GITHUB_CLIENT_ID` and have users connect GitHub account.

**"Database connection refused"**  
→ Supabase only allows connections from IP ranges. In Supabase dashboard: Settings → Database → Network banning. Add your VPS IP or use the connection pooler URL.

**"All AI providers exhausted"**  
→ Add multiple Groq keys: `GROQ_API_KEYS=gsk_key1,gsk_key2` or ensure OpenRouter key is set.

**"WeasyPrint fails on PDF export"**  
→ Missing system libs. Run: `docker compose exec api apt install -y libcairo2 libpango-1.0-0 libpangocairo-1.0-0`

**"PPTX export fails"**  
→ Run: `docker compose exec api pip install python-pptx --break-system-packages`

**Analysis stuck at 0%**  
→ Worker container not running. Check: `docker compose ps worker`. Restart: `docker compose restart worker`

---

## Scaling When Traffic Grows

```bash
# Scale analysis workers
docker compose up -d --scale worker=4

# Add more Groq API keys for higher throughput
# In .env: GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3,gsk_key4

# Enable Redis connection pooling
# In .env: REDIS_URL=rediss://... (use TLS on Upstash)

# Add Sentry for error tracking
# In .env: SENTRY_DSN=https://...@sentry.io/...
```

---

*EMEMZYVISUALS DIGITALS · archdefend.io · @ememzyvisuals*
