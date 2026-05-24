# ArchDefend — Deployment Guide

> Complete walkthrough for Emmanuel / @ememzyvisuals

---

## Prerequisites

- VPS or cloud server (Ubuntu 22.04+, 2 CPU / 4GB RAM minimum)
- Domain name pointed to server IP
- Vercel account (for frontend)
- Supabase account (free tier works)
- Upstash account (Redis, free tier)
- Groq API key (free at console.groq.com)
- GitHub OAuth app credentials
- (Optional) NOWPayments account for crypto billing

---

## Step 1 — Supabase Setup

1. Create project at supabase.com
2. Go to **Project Settings → Database → Connection string**
3. Copy the `postgresql://` URI
4. Enable `pgvector` extension:
   - Go to **Database → Extensions**
   - Search for `vector` and enable it
5. Get your **Service Role Key** from Settings → API

---

## Step 2 — Upstash Redis

1. Create account at upstash.com
2. Create a Redis database (select region closest to your server)
3. Copy the **Redis URL** (format: `redis://default:password@endpoint.upstash.io:6379`)

---

## Step 3 — GitHub OAuth App

1. Go to github.com/settings/developers
2. Click **New OAuth App**
3. Set:
   - Application name: `ArchDefend`
   - Homepage URL: `https://archdefend.io`
   - Authorization callback URL: `https://archdefend.io/api/v1/auth/github/callback`
4. Copy **Client ID** and **Client Secret**

---

## Step 4 — Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Git
sudo apt install git -y

# Clone ArchDefend
git clone https://github.com/ememzyvisuals/archdefend
cd archdefend
```

---

## Step 5 — Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in:

```env
ENVIRONMENT=production
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

DATABASE_URL=postgresql+asyncpg://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...

REDIS_URL=redis://default:password@your-endpoint.upstash.io:6379

GROQ_API_KEY=gsk_your_key_here
OPENROUTER_API_KEY=sk-or-your_key

GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=https://archdefend.io/api/v1/auth/github/callback

NOWPAYMENTS_API_KEY=your_key
NOWPAYMENTS_IPN_SECRET=your_secret

ALLOWED_HOSTS=["archdefend.io","www.archdefend.io","localhost"]
CORS_ORIGINS=["https://archdefend.io","https://www.archdefend.io","http://localhost:3000"]
```

---

## Step 6 — SSL Certificate

```bash
# Install Certbot
sudo apt install certbot -y

# Get certificate (standalone mode)
sudo certbot certonly --standalone -d archdefend.io -d www.archdefend.io

# Copy certs to nginx directory
sudo mkdir -p infrastructure/nginx/certs
sudo cp /etc/letsencrypt/live/archdefend.io/fullchain.pem infrastructure/nginx/certs/
sudo cp /etc/letsencrypt/live/archdefend.io/privkey.pem infrastructure/nginx/certs/
sudo chmod 644 infrastructure/nginx/certs/*.pem
```

---

## Step 7 — Launch Backend

```bash
# Build and start all services
docker compose up -d --build

# Check logs
docker compose logs -f api

# Run database migrations
docker compose exec api alembic upgrade head

# Verify health
curl https://archdefend.io/health
# → {"status": "operational"}
```

---

## Step 8 — Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

cd apps/web

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://archdefend.io

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Enter your Supabase URL

# Deploy
vercel --prod
```

Or connect your GitHub repo to Vercel directly at vercel.com/new.

---

## Step 9 — Verify Everything

```bash
# API health
curl https://archdefend.io/api/v1/health

# Deep health (db + redis)
curl https://archdefend.io/api/v1/health/deep

# Check containers
docker compose ps

# Check logs
docker compose logs --tail=50 api
docker compose logs --tail=50 worker
```

---

## Step 10 — Auto-Renew SSL

```bash
# Add cron job
crontab -e

# Add this line:
0 12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/archdefend.io/*.pem /home/ubuntu/archdefend/infrastructure/nginx/certs/ && docker compose restart nginx
```

---

## Monitoring

### View real-time logs
```bash
docker compose logs -f api worker
```

### Scale workers
```bash
docker compose up -d --scale worker=4
```

### Database backup
```bash
docker compose exec postgres pg_dump -U archdefend archdefend > backup_$(date +%Y%m%d).sql
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `GROQ_API_KEY` | ✅ | Groq AI API key |
| `SECRET_KEY` | ✅ | App secret (32+ chars) |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth client secret |
| `OPENROUTER_API_KEY` | Recommended | Fallback LLM provider |
| `NOWPAYMENTS_API_KEY` | For billing | Crypto payment processor |
| `SENTRY_DSN` | Optional | Error tracking |

---

## Troubleshooting

**Clone fails with "git not found"**
```bash
docker compose exec api which git
# If missing: apt install git in Dockerfile
```

**Database connection error**
- Check `DATABASE_URL` is correct
- Ensure Supabase allows your server IP in network restrictions

**Groq rate limits**
- Add multiple keys: `GROQ_API_KEYS=key1,key2,key3`
- Or set `OPENROUTER_API_KEY` as fallback

**PPTX export fails**
```bash
docker compose exec api pip install python-pptx
```

---

*By EMEMZYVISUALS DIGITALS — @ememzyvisuals*
