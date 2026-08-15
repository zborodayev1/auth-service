---
title: Phase 0.34 — Dockerfile & CI/CD
date: 2026-08-15
status: planning
priority: medium — required before any deployment; CI before any team collaboration
---

# Phase 0.34 — Dockerfile & CI/CD

Service has no Dockerfile and no CI pipeline. This phase adds both. These are independent — CI can ship before Dockerfile if needed.

---

## 0.34.1 — Dockerfile (multi-stage)

**Problem:** No way to containerize the service. `docker-compose.yml` only starts PostgreSQL.

**Multi-stage build:** build stage compiles TypeScript → production stage runs `dist/`. Keeps final image lean (no devDependencies, no TypeScript compiler).

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN npx prisma generate

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/main.js"]
```

**`.dockerignore`:**
```
node_modules
dist
.env*
*.log
coverage
docs
```

**`docker-compose.yml` update** — add the service itself:
```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/auth
      REDIS_URL: redis://redis:6379
      HTTP_PORT: 8080
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 1h
      BCRYPT_ROUNDS: 12
      REFRESH_TOKEN_TTL_MS: 2592000000
    depends_on:
      - postgres
      - redis
    command: >
      sh -c "npx prisma migrate deploy && node dist/main.js"

volumes:
  pg_data:
```

**Note:** `prisma migrate deploy` (not `migrate dev`) runs existing migrations in production — does not create new ones.

---

## 0.34.2 — GitHub Actions CI

**Problem:** No automated checks on PR. Lint, typecheck, tests run manually only.

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  lint-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: auth_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/auth_test
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: test-secret-that-is-at-least-32-characters-long
      JWT_EXPIRES_IN: 1h
      BCRYPT_ROUNDS: 4
      REFRESH_TOKEN_TTL_MS: 2592000000
      HTTP_PORT: 8080
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: pnpm test:integration
```

**Notes:**
- `BCRYPT_ROUNDS: 4` in CI — bcrypt at 12 rounds makes tests 10× slower. Use 4 in test env.
- `migrate deploy` in CI (not `migrate dev`) — applies existing migrations to fresh DB.
- Split lint/typecheck from tests so failures are easy to locate.

---

## 0.34.3 — trust proxy

**Problem:** `express-rate-limit` is IP-based. Behind nginx / k8s ingress, `req.ip` is always the load balancer IP. Rate limit becomes shared across all clients.

**Fix:** one line in Express app setup:
```ts
app.set('trust proxy', 1) // trust first proxy
```

This makes Express read client IP from `X-Forwarded-For` header. Add alongside other app configuration, before routes are mounted.

**Only enable in production** or behind a known proxy — in local dev with no proxy, `trust proxy` is unnecessary but harmless.

---

## Priority Order

1. `trust proxy` — one line, security correctness, ship immediately
2. Dockerfile — needed before any deploy attempt
3. GitHub Actions CI — lint+typecheck+unit tests first (no services), then integration job
4. `docker-compose.yml` update — convenient for local full-stack dev
