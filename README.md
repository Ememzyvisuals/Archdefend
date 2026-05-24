# ArchDefend

**Enterprise-grade AI infrastructure for understanding, analyzing, and defending real-world software architecture.**

By [EMEMZYVISUALS DIGITALS](https://github.com/ememzyvisuals) · [@ememzyvisuals](https://x.com/ememzyvisuals)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue)](https://python.org)

---

## What is ArchDefend?

ArchDefend is an AI-powered codebase intelligence platform. Paste any GitHub repository URL and receive:

- **Architecture understanding** — AI-generated explanations of system design
- **Dependency graphs** — Interactive React Flow visualization of all relationships
- **Security analysis** — Static analysis for vulnerabilities, exposed secrets, SSRF risks
- **API inventory** — Automatically discovered endpoints, routes, middleware
- **Scalability assessment** — Bottleneck detection and scaling recommendations
- **Production readiness score** — Quantified readiness across observability, testing, deployment
- **Interview defense questions** — Role-specific Q&A grounded in your actual codebase
- **Exportable reports** — PDF, PPTX, Markdown, HTML

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, React Flow |
| Backend | FastAPI, Python 3.12, asyncpg |
| Database | PostgreSQL (Supabase) + pgvector |
| Cache | Redis / Upstash |
| AI Primary | Groq (`llama-3.3-70b-versatile`) |
| AI Fallback | OpenRouter (Claude 3.5 Sonnet / Llama 3.3) |
| Parser | Tree-sitter AST |
| Graph | NetworkX |
| Exports | WeasyPrint (PDF), python-pptx |
| Auth | GitHub OAuth + email/password |
| Payments | NOWPayments (crypto) |
| Deployment | Vercel (frontend) + Docker (backend) |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- Python ≥ 3.12
- Docker + Docker Compose
- PostgreSQL (or Supabase account)
- Redis (or Upstash account)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Setup

```bash
git clone https://github.com/ememzyvisuals/archdefend
cd archdefend
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

This starts:
- FastAPI backend on `http://localhost:8000`
- PostgreSQL with pgvector
- Redis cache
- Nginx reverse proxy

### 3. Start Frontend

```bash
cd apps/web
pnpm install
pnpm dev
# → http://localhost:3000
```

### 4. Run Migrations

```bash
cd apps/api
alembic upgrade head
```

---

## API Reference

### Start Analysis

```http
POST /api/v1/analysis/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "repo_url": "https://github.com/user/repo",
  "include_security": true,
  "include_interview_prep": true
}
```

### Get Status

```http
GET /api/v1/analysis/{analysis_id}/status
Authorization: Bearer <token>
```

### Stream Progress (SSE)

```http
GET /api/v1/analysis/{analysis_id}/stream
Authorization: Bearer <token>
```

### Get Report

```http
GET /api/v1/analysis/{analysis_id}/report
Authorization: Bearer <token>
```

---

## Credit System

| Action | Credits |
|--------|---------|
| Small repo analysis (< 50 files) | 5 |
| Medium repo analysis | 15 |
| Large repo analysis (> 500 files) | 40 |
| PPTX export | 5 |
| Security deep scan | 15 |
| Interview prep pack | 5 |

**Plans:**
- Free: 20 credits/month
- Pro ($19/mo): 250 credits
- Team ($79/mo): 1,200 credits

---

## Security

ArchDefend is built with security-first principles:

- **No code execution** — Cloned repositories are never executed. Static analysis only.
- **SSRF protection** — DNS resolution validation blocks private IP ranges
- **Path traversal prevention** — All file access is scoped to the cloned directory
- **ZIP bomb protection** — Repository size limits enforced before and after clone
- **Isolated workspaces** — Each analysis runs in a separate temp directory, cleaned up after
- **Rate limiting** — Per-user, per-IP rate limits on all endpoints
- **Non-root Docker** — API runs as unprivileged user

See [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) for full details.

---

## Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment guide including:
- Vercel deployment for frontend
- Railway/Render/VPS for FastAPI backend
- Supabase configuration
- Upstash Redis setup
- NOWPayments webhook setup
- SSL/TLS configuration

---

## Architecture

```
Frontend (Next.js 15)
    ↓ HTTPS
FastAPI Gateway (Python)
    ↓
Repository Cloner (git clone --depth 1)
    ↓
Parser Engine (Tree-sitter AST)
    ↓
Dependency Graph Builder (NetworkX)
    ↓
Semantic Chunking + pgvector
    ↓
LLM Routing Layer (Groq → OpenRouter)
    ↓
Report Generator
    ↓
Export Engine (PDF/PPTX/MD/HTML)
    ↓
Frontend Dashboard
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system documentation.

---

## Contributing

PRs welcome. Please read the [contribution guide](CONTRIBUTING.md) first.

## License

MIT License — see [LICENSE](LICENSE)

---

*Built with precision by [EMEMZYVISUALS DIGITALS](https://github.com/ememzyvisuals)*
