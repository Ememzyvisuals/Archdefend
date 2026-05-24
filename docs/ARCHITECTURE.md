# ArchDefend — System Architecture

> Technical architecture reference
> By EMEMZYVISUALS DIGITALS

---

## Overview

ArchDefend is a multi-service platform built as a monorepo with a Next.js 15 frontend and FastAPI Python backend, connected to Supabase (PostgreSQL + pgvector) and Redis.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│           Next.js 15 App Router · React Flow · Framer Motion        │
└────────────────────────┬────────────────────────────────────────────┘
                         │ HTTPS / SSE
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Nginx (Reverse Proxy)                          │
│              Rate Limiting · SSL Termination · Security Headers      │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FastAPI Gateway (Python 3.12)                    │
│                                                                      │
│  /auth    → GitHub OAuth + JWT + email/password                     │
│  /analysis → Submit, stream progress, retrieve report               │
│  /reports → PDF / PPTX / Markdown export                            │
│  /billing → NOWPayments checkout + webhook handler                  │
│  /health  → Health + deep health check                              │
└──────┬──────────────────────────┬──────────────────────────────────┘
       │ PostgreSQL (async)        │ Redis (job queue + cache)
       ▼                          ▼
┌──────────────┐        ┌──────────────────────────────────────────────┐
│   Supabase   │        │             Dramatiq Worker Pool              │
│  PostgreSQL  │        │                                              │
│  + pgvector  │        │  Stage 1: Repository Clone (git clone)       │
└──────────────┘        │  Stage 2: AST Parser (Tree-sitter)          │
                        │  Stage 3: Graph Builder (NetworkX)           │
                        │  Stage 4: LLM Router (Groq → OpenRouter)    │
                        │  Stage 5: Report Generator                   │
                        │  Stage 6: Export Engine (PDF/PPTX)          │
                        └──────────────────────────────────────────────┘
```

---

## Service Breakdown

### Frontend (`apps/web`)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | Next.js 15 App Router | SSR + routing |
| State | Zustand + persist | Auth + analysis state |
| UI | Tailwind CSS + shadcn/ui | Design system |
| Animation | Framer Motion | Transitions |
| Graph | React Flow | Dependency visualization |
| Data fetching | SWR + axios | API calls |
| Streaming | EventSource (SSE) | Real-time progress |

### Backend (`apps/api`)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | FastAPI 0.115 | API gateway |
| ORM | SQLAlchemy 2.0 async | Database access |
| DB driver | asyncpg | PostgreSQL async |
| Queue | Dramatiq + Redis | Background jobs |
| Auth | python-jose + passlib | JWT + bcrypt |

### Analysis Pipeline (`services/`)

| Service | Technology | Purpose |
|---------|-----------|---------|
| `repo-cloner` | subprocess + asyncio | Secure git clone |
| `parser-engine` | Tree-sitter + regex | AST + pattern analysis |
| `graph-engine` | NetworkX | Dependency graph construction |
| `llm-router` | httpx | Groq/OpenRouter routing + failover |
| `llm-analyzer` | Custom prompts | Architecture intelligence |
| `export-engine` | WeasyPrint + python-pptx | Report generation |
| `billing-engine` | httpx | NOWPayments integration |

---

## Data Flow — Analysis Pipeline

```
User submits GitHub URL
         │
         ▼
1. URL Validation
   ├─ Regex: must match github.com/owner/repo
   ├─ DNS resolution: block private IPs (SSRF)
   └─ Allowlist: github.com, gitlab.com, bitbucket.org only

         │
         ▼
2. Credit Check & Deduction
   ├─ Estimate cost (small=5, medium=15, large=40)
   ├─ Atomic credit deduction in PostgreSQL
   └─ Return 402 if insufficient

         │
         ▼
3. Analysis Record Created (status=pending)
   └─ Background task enqueued to Dramatiq

         │
         ▼
4. Repository Clone [status=cloning]
   ├─ git clone --depth 1 --single-branch
   ├─ Isolated workspace: /tmp/archdefend/{sha256(analysis_id)}/
   ├─ Timeout: 120s
   └─ Size validation: max 500MB

         │
         ▼
5. AST Parsing [status=parsing]
   ├─ Tree-sitter for Python, TS, JS, Go, Rust, Java, etc.
   ├─ Extract: imports, exports, classes, functions, routes
   ├─ Security pattern scan (CWE patterns)
   ├─ File count, language stats, line counts
   └─ Skip: node_modules, .git, binaries, >500KB files

         │
         ▼
6. Graph Construction [status=analyzing]
   ├─ Build directed dependency graph (NetworkX)
   ├─ Node = module/file, Edge = import relationship
   ├─ Compute connectivity scores
   └─ Convert to React Flow format (top 60 nodes)

         │
         ▼
7. LLM Analysis [status=analyzing]
   ├─ Architecture summary (Groq llama-3.3-70b)
   ├─ Security enrichment (Groq)
   ├─ Interview questions (Groq)
   ├─ Scalability assessment (Groq)
   ├─ Recommendations (Groq fast model)
   ├─ Hallucination detection (cross-validate with AST facts)
   └─ Failover: Groq → OpenRouter Claude 3.5 → OpenRouter Llama

         │
         ▼
8. Report Storage [status=generating]
   └─ AnalysisReport record in PostgreSQL

         │
         ▼
9. Workspace Cleanup [always]
   └─ rm -rf /tmp/archdefend/{workspace}/

         │
         ▼
10. Status → completed
    └─ SSE stream sends done=true to frontend
```

---

## LLM Routing Strategy

```
Request
  │
  ├─→ Groq (llama-3.3-70b-versatile)
  │     ├─ Success → return result
  │     └─ Rate limit → mark key, try next key
  │
  └─→ If all Groq keys rate-limited:
        │
        ├─→ OpenRouter (anthropic/claude-3.5-sonnet)
        │     ├─ Success → return result
        │     └─ Fail → try fallback
        │
        └─→ OpenRouter (meta-llama/llama-3.3-70b-instruct)
              ├─ Success → return result
              └─ Fail → raise RuntimeError
```

**Key rotation:** Multiple Groq/OpenRouter keys loaded from `GROQ_API_KEYS=key1,key2,key3`. Round-robin with per-key rate limit tracking.

---

## Database Schema

```
users
  id (UUID PK)
  email (unique)
  password_hash
  github_id
  plan (free|pro|team)
  credits

analyses
  id (UUID PK)
  user_id → users.id
  repo_url
  status
  progress_pct
  language_stats (JSONB)

analysis_reports
  id (UUID PK)
  analysis_id → analyses.id (unique)
  architecture_summary (TEXT)
  dependency_graph (JSONB)
  security_findings (JSONB)
  interview_questions (JSONB)
  scalability_score
  production_readiness_score

subscriptions
  id (UUID PK)
  user_id → users.id
  plan
  nowpayments_payment_id
  status

credit_transactions
  id (UUID PK)
  user_id → users.id
  amount (positive=add, negative=deduct)
  balance_after
  reason
```

---

## Deployment Topology

```
Vercel (CDN edge)        →  Next.js frontend
Ubuntu VPS / Railway     →  FastAPI + Nginx (Docker)
Supabase                 →  PostgreSQL + pgvector
Upstash                  →  Redis (queue + cache)
NOWPayments              →  Crypto payment processing
```

---

*EMEMZYVISUALS DIGITALS — archdefend.io*
