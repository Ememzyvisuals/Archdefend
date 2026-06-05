# ArchDefend

> **Architecture Intelligence For Real Engineering Teams**

Transform any GitHub repository into a living architecture intelligence platform. Understand, document, monitor, and defend your software architecture with AI.

Built by **Ememzyvisuals** · © Ememzyvisuals

---

## What It Does

- **Architecture Map** — React Flow graph of every module, class, function, and API endpoint
- **AI Analysis** — Groq-powered architecture overview, risk assessment, and recommendations
- **7 Report Types** — Architecture overview, onboarding guide, interview defense, security audit, tech debt, dependency analysis, scalability
- **Security Center** — Detect secrets, circular dependencies, vulnerable patterns, and architecture smells
- **Drift Detection** — Compare analyses over time and track changes
- **Export** — PDF, Markdown, PPTX
- **RBAC Workspaces** — Owner, admin, member, viewer roles

---

## Tech Stack

### Frontend
- Next.js 15 App Router + React 19
- TypeScript, TailwindCSS, shadcn/ui
- React Flow (architecture maps)
- Framer Motion, TanStack Query, Zustand

### Backend
- FastAPI + Python 3.12
- SQLModel + Alembic
- tree-sitter (multi-language parsing)
- NetworkX (graph analysis)
- Groq (primary AI) + OpenRouter (fallback)

### Infrastructure
- Supabase (PostgreSQL + Auth)
- Upstash Redis (caching + queues)
- Vercel (frontend)
- Render (backend)
- NOWPayments (crypto payments)

---

## Project Structure

```
archdefend/
├── apps/
│   ├── web/               # Next.js 15 frontend
│   └── api/               # FastAPI backend
├── packages/
│   ├── ui/                # Shared UI components
│   ├── types/             # Shared TypeScript types
│   ├── prompts/           # AI prompt templates
│   └── lib/               # Shared utilities
├── docs/
├── infrastructure/
├── docker-compose.yml
└── turbo.json
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- Python 3.12
- Git

### 1. Clone & Install

```bash
git clone https://github.com/ememzyvisuals/archdefend.git
cd archdefend
npm install
```

### 2. Backend Setup

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in all values in .env
```

### 3. Frontend Setup

```bash
cd apps/web
cp .env.example .env.local
# Fill in all values in .env.local
```

### 4. Database Migration

```bash
cd apps/api
alembic upgrade head
```

### 5. Run Development

```bash
# Terminal 1 - Backend
cd apps/api && uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd apps/web && npm run dev
```

Or with Turbo:
```bash
npm run dev
```

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL async URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `REDIS_URL` | Upstash Redis URL |
| `JWT_SECRET` | JWT signing secret (≥32 chars) |
| `SECRET_KEY` | App secret key (≥32 chars) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_CALLBACK_URL` | OAuth callback URL |
| `GROQ_API_KEY` | Groq API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `NOWPAYMENTS_API_KEY` | NOWPayments API key |
| `NOWPAYMENTS_IPN_SECRET` | NOWPayments webhook secret |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

---

## GitHub OAuth Setup

1. Go to **GitHub Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set **Authorization callback URL** to `https://YOUR_RENDER_URL/api/auth/github/callback`
3. Copy **Client ID** and **Client Secret** to your backend `.env`

---

## Deployment

### Backend → Render

1. Connect your GitHub repo to Render
2. Set **Build Command**: `pip install -r requirements.txt`
3. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `apps/api/.env.example`
5. Set **Root Directory**: `apps/api`

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set **Framework Preset**: Next.js
3. Set **Root Directory**: `apps/web`
4. Add all environment variables from `apps/web/.env.example`

### Database → Supabase

1. Create a new Supabase project
2. Run the migration: `alembic upgrade head`
3. Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`

---

## API Documentation

When running locally, Swagger UI is available at:
```
http://localhost:8000/docs
```

Key endpoints:
- `GET /api/auth/github` — Get GitHub OAuth URL
- `GET /api/auth/github/callback` — GitHub OAuth callback
- `POST /api/auth/google` — Google sign-in
- `GET /api/auth/me` — Get current user
- `GET /api/workspaces/my` — List workspaces
- `POST /api/repositories/connect` — Connect GitHub repo
- `GET /api/analyses/{id}/graph` — Get React Flow graph data
- `POST /api/reports/generate` — Generate AI report
- `GET /api/analyses/{id}/security` — Security findings

---

## License

MIT License — Built by Ememzyvisuals

---

> "Architecture intelligence for real engineering teams."
