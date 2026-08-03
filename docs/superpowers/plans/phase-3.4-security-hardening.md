---
title: Phase 3.4 — Security Hardening
date: 2026-08-03
status: backlog
priority: medium — pre-production hardening
---

# Phase 3.3 — Security Hardening

Three independent improvements that reduce attack surface and improve observability. None require architectural changes.

---

## 3.3.1 — Rate Limiting on Auth Endpoints

**Problem:** `/login`, `/refresh`, `/register` have no throttling. Auth endpoints are primary brute-force targets.

**Implementation:** `express-rate-limit` (zero deps, battle-tested).

```bash
pnpm add express-rate-limit
```

```ts
// src/presentation/http/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,                    // 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try later' },
})
```

Apply to login + refresh only (register can be more lenient or share the same limiter):

```ts
// UserRouter
router.post('/login',   authRateLimiter, c.login.bind(c))
router.post('/refresh', authRateLimiter, c.refresh.bind(c))

// ClientRouter
router.post('/login',   authRateLimiter, c.login.bind(c))
router.post('/refresh', authRateLimiter, c.refresh.bind(c))
```

**Note:** IP-based limiting works for single-instance. Multi-instance (Phase 3+) needs Redis store (`rate-limit-redis`).

---

## 3.3.2 — Health Check Endpoint

**Problem:** No `/health` endpoint. Docker, k8s, and uptime monitors can't verify service liveness.

**Implementation:** Mount before all auth middleware. No DB query needed for liveness.

```ts
// src/infrastructure/http/ExpressApp.ts (or a dedicated HealthRouter)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() })
})
```

Optional readiness check (pings DB):
```ts
app.get('/health/ready', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.status(200).json({ status: 'ready' })
})
```

---

## 3.3.3 — Request Correlation IDs

**Problem:** Pino is wired but logs have no per-request ID. Cross-request debugging is blind.

**Implementation:** Middleware adds `x-request-id` header + attaches to Pino child logger.

```ts
// src/presentation/http/middleware/correlationId.ts
import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) ?? randomUUID()
  req.requestId = id
  res.setHeader('x-request-id', id)
  next()
}
```

Extend Express `Request` type:
```ts
// src/types/express.d.ts
declare namespace Express {
  interface Request {
    requestId: string
  }
}
```

In handlers/middleware, use `logger.child({ requestId: req.requestId })` for structured log lines.

Mount first in `ExpressApp` (before routes).

---

## 3.3.4 — `JWT_SECRET` minimum length not enforced

**Problem:** `ServerConfig` checks `JWT_SECRET` is set but not that it's long enough. `JWT_SECRET=x` passes startup validation. HS256 with a short secret is brute-forceable.

**Fix:** add a length check in `ServerConfig.string()` or as a post-constructor assertion:

```ts
if (this.jwtSecret.length < 32) {
  throw new InternalServerError('JWT_SECRET must be at least 32 characters')
}
```

`.env.example` already documents "min 32 chars" — code should enforce what the docs say.

---

## Priority Order

1. Rate limiting — lowest effort, direct security win
2. Health check — trivial, needed before any deploy
3. `JWT_SECRET` length check — one line, zero risk
4. Correlation IDs — more wiring but essential for production debugging
