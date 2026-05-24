# ArchDefend — Security Audit

> Internal post-build security analysis
> By EMEMZYVISUALS DIGITALS

---

## Executive Summary

ArchDefend is a codebase analysis platform that handles untrusted repository URLs and analyzes potentially adversarial codebases. This audit documents all security controls implemented.

**Threat Model:** Adversarial users submitting malicious repository URLs, ZIP files with path traversal, or code designed to break the analysis pipeline.

---

## 1. SSRF Protection

**Risk:** Attacker submits `https://169.254.169.254/latest/meta-data/` (AWS metadata) or internal URLs.

**Controls Implemented:**

```python
# services/repo-cloner/cloner.py

BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),      # Private
    ipaddress.ip_network("172.16.0.0/12"),   # Private
    ipaddress.ip_network("192.168.0.0/16"),  # Private
    ipaddress.ip_network("127.0.0.0/8"),     # Loopback
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local (cloud metadata)
    ipaddress.ip_network("::1/128"),         # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),        # IPv6 private
]

def _check_ssrf_dns(hostname: str) -> None:
    """Resolve hostname and block private IP ranges."""
    addr_infos = socket.getaddrinfo(hostname, None)
    for _, _, _, _, sockaddr in addr_infos:
        ip = ipaddress.ip_address(sockaddr[0])
        for network in BLOCKED_NETWORKS:
            if ip in network:
                raise ValueError(f"Blocked private IP range")
```

**Allowlist:** Only `github.com`, `gitlab.com`, `bitbucket.org` are accepted.

**Status: ✅ Implemented**

---

## 2. Code Execution Prevention

**Risk:** Analysis pipeline accidentally executes cloned repository code.

**Controls:**

- Zero execution — only `open()`, `read()`, and `re.finditer()` on source files
- Tree-sitter AST parsing is purely lexical — no evaluation
- Git clone uses `--no-checkout` equivalent (only source files, no hooks)
- Docker container has no `--privileged` flag
- API runs as non-root user `archdefend`

**Git configuration (Dockerfile):**
```dockerfile
RUN git config --global protocol.file.allow never \
    && git config --global protocol.allow never \
    && git config --global protocol.https.allow always
```

This prevents:
- Local protocol abuse (`git clone file:///etc/passwd`)
- Git hook execution during clone
- Submodule attacks

**Status: ✅ Implemented**

---

## 3. Path Traversal Prevention

**Risk:** Maliciously crafted repository contains symlinks or filenames like `../../../../etc/passwd`.

**Controls:**

```python
# All file access is scoped to clone_path
for path in clone_path.rglob("*"):
    # Validate relative path
    try:
        rel = path.relative_to(clone_path)  # Raises ValueError if outside
    except ValueError:
        continue  # Skip paths outside workspace

    # Skip symlinks that escape directory
    if path.is_symlink():
        target = path.resolve()
        if not str(target).startswith(str(clone_path)):
            continue
```

**Status: ✅ Implemented**

---

## 4. ZIP Bomb Protection

**Risk:** Attacker uploads a ZIP file that decompresses to terabytes (e.g., 42.zip).

**Controls:**

- Repository size limit: `MAX_REPO_SIZE_MB = 500` (configurable)
- Size checked AFTER clone, before analysis
- Individual file size limit: files > 500KB skipped during parsing
- File count hard cap: 5,000 files maximum

```python
repo_size = await self._get_dir_size(clone_path)
if repo_size > MAX_REPO_SIZE_BYTES:
    self.cleanup(analysis_id)
    raise ValueError(f"Repository too large: {repo_size}MB")
```

**Status: ✅ Implemented**

---

## 5. Rate Limiting

**Multiple layers:**

| Layer | Limit | Scope |
|-------|-------|-------|
| Nginx | 20 req/min | Per IP |
| Auth endpoints | 5 req/min | Per IP |
| API application | 100 req/hour | Per user |
| Concurrent analyses | 3 active | Per user |

**Status: ✅ Implemented**

---

## 6. Authentication Security

- JWT tokens signed with `HS256`, expiry 24 hours
- Passwords hashed with `bcrypt` (12 rounds)
- GitHub OAuth state parameter validated (CSRF protection)
- OAuth state expires after 10 minutes
- No long-term credential storage (GitHub tokens stored for session only)
- `httponly` cookie option available for token storage

**Status: ✅ Implemented**

---

## 7. Payment Security

- NOWPayments webhook signature verified with HMAC-SHA512
- Payment state NEVER trusted from frontend
- Credits only allocated on verified webhook receipt
- Order IDs scoped per-user to prevent replay attacks
- Subscription records stored server-side

**Status: ✅ Implemented**

---

## 8. Infrastructure Security

- Docker containers run as non-root user
- No privileged containers
- Temp directories auto-deleted after analysis
- Secrets loaded from environment variables (never committed)
- Database connections use connection pooling with timeouts
- Redis configured with memory limits (`maxmemory 512mb`)
- Nginx rate limiting + security headers
- HSTS enabled with preload
- CSP headers configured

**Status: ✅ Implemented**

---

## 9. Dependency Auditing

Run regularly:

```bash
# Python dependencies
cd apps/api
pip install safety
safety check -r requirements.txt

# Node.js dependencies
cd apps/web
pnpm audit

# Docker image scanning
docker scout cves archdefend-api:latest
```

---

## 10. Known Limitations / Accepted Risks

| Item | Risk | Mitigation |
|------|------|------------|
| Private repo access via OAuth token | Token compromise exposes repos | Tokens not stored long-term; scope limited to `read` |
| LLM prompt injection via repo content | Malicious code comments in analyzed repo | LLM given structured prompts; repo content in `user` role only |
| Resource exhaustion on very large repos | DoS via 500MB repos | Hard size limits; per-user concurrency limits |

---

## Recommended Production Hardening

1. **Secret scanning:** Add GitHub secret scanning to CI/CD
2. **WAF:** Deploy Cloudflare WAF in front of Nginx
3. **Container isolation:** Use gVisor/Firecracker for clone sandbox
4. **Audit logging:** Log all analysis starts to immutable audit trail
5. **Intrusion detection:** Deploy Falco for container runtime security
6. **Dependency auto-update:** Enable Dependabot PRs

---

*Last updated: May 2026*
*By EMEMZYVISUALS DIGITALS — archdefend.io*
