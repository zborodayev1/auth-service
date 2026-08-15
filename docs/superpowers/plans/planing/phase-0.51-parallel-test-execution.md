---
title: Phase 0.51 — Parallel Test Execution
date: 2026-08-16
status: planning
priority: high — 1 worker per file, all parallel → total time ≈ slowest single file (~1-3s); current 40s suite becomes ~2-3s
---

# Phase 0.51 — Parallel Test Execution

Goal: run each test file in its own worker simultaneously. With 46 files the speedup is dramatic — total wall time collapses from the sum of all files to the time of the single slowest file.

**Theoretical speedup:** 46 files × ~0.8s avg = 38s sequential → slowest file ~1.3s parallel = **~29x faster**.

Currently blocked by two things: shared DB schema (data races) and PostgreSQL connection limits. Both are solvable.

---

## 0.51.1 — Why parallelism breaks today

**Problem A — Shared DB schema:**
All 46 workers would write to the same tables simultaneously. Worker A's `beforeEach → truncateAll` deletes rows Worker B is currently reading mid-test. Result: random `null` / `not found` failures — impossible to debug.

**Problem B — Connection pool exhaustion:**
Prisma defaults to 5-10 connections per client. 46 workers × 5 = 230 connections. PostgreSQL default `max_connections = 100` → workers start failing to connect.

**Problem C — `fileParallelism: false` in vitest config:**
One line, easy to flip — but meaningless without fixing A and B first.

---

## 0.51.2 — Fix A: per-worker PostgreSQL schema

Each worker gets its own isolated PostgreSQL schema (`test_<worker_pid>`). Workers never touch each other's tables.

**How it works:**
- PostgreSQL schemas are namespaces within a single DB
- `CREATE SCHEMA test_abc123` creates a fully isolated set of tables
- Prisma targets a schema via `DATABASE_URL?schema=test_abc123`
- `DROP SCHEMA test_abc123 CASCADE` removes everything after the file finishes

**Worker setup flow:**
```
beforeAll (per file):
  1. Generate unique schema name: test_<uuid>
  2. CREATE SCHEMA test_<uuid>
  3. Apply all migrations to test_<uuid>
  4. Reconnect Prisma with DATABASE_URL?schema=test_<uuid>

afterAll (per file):
  DROP SCHEMA test_<uuid> CASCADE
  prisma.$disconnect()
```

**Schema helper:**
```ts
// src/tests/helpers/schema.ts
import { randomUUID } from 'crypto'

export function generateTestSchema(): string {
  return `test_${randomUUID().replace(/-/g, '_')}`
}
```

**`PrismaProvider` test mode:**
```ts
constructor() {
  const base = process.env['DATABASE_URL']!
  const schema = process.env['TEST_SCHEMA']  // set per-worker before Prisma init

  this.client = new PrismaClient({
    datasources: {
      db: { url: schema ? `${base}?schema=${schema}` : base },
    },
  })
}
```

**Running migrations on the schema:**
```ts
// prisma migrate deploy targets the schema via DATABASE_URL
process.env['DATABASE_URL'] = `${base}?schema=${schema}`
execSync('npx prisma migrate deploy', { stdio: 'inherit' })
```

Or use `prisma.$executeRawUnsafe` to replay migration SQL directly — faster than spawning a child process per worker.

**Global setup file** (runs once before all workers start):
```ts
// src/tests/setup.parallel.ts
// Nothing needed globally — each worker manages its own schema.
// Remove the global afterAll(disconnectTestDb) — each file handles its own cleanup.
```

---

## 0.51.3 — Fix B: connection limit

Set `connection_limit=1` in `DATABASE_URL` for tests. Each worker uses exactly 1 connection.

```
# .env.test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_test?connection_limit=1&pool_timeout=10
```

**Math:** 46 workers × 1 connection = 46 total connections. PostgreSQL default `max_connections = 100` → comfortable headroom.

`pool_timeout=10` — if a connection isn't available within 10s, fail fast instead of hanging forever.

---

## 0.51.4 — vitest config

```ts
// vitest.integration.config.ts
export default defineConfig({
  test: {
    fileParallelism: true,     // ← 1 worker per file, all parallel
    // Remove maxConcurrency limit — let all 46 files run simultaneously
    // Connection pool handles backpressure via pool_timeout
    setupFiles: ['reflect-metadata'],  // remove setup.integration.ts (had global afterAll)
    // ...
  },
})
```

Remove `fileParallelism: false`. Remove the global `setup.integration.ts` (its `afterAll(disconnectTestDb)` doesn't make sense per-worker — each file handles its own cleanup).

Each test file gets:
```ts
// Pattern every test file follows:
import { setupTestSchema, teardownTestSchema } from '@tests/helpers/schema'

beforeAll(async () => { await setupTestSchema() })
afterAll(async () => { await teardownTestSchema() })
beforeEach(async () => { await truncateAll(container) })
```

Or consolidate into a single `useTestDb()` helper that registers all three hooks.

---

## 0.51.5 — Container singleton: no change needed

With per-worker isolation, each worker has its own Node.js module scope → `_container` is already per-worker. The singleton pattern works correctly. No changes to `container.ts`.

---

## 0.51.6 — truncateAll: still needed within a file

`truncateAll` in `beforeEach` stays — it isolates tests WITHIN the same file. Without it, test 2 sees data from test 1. The only thing that disappears is the need for cross-file isolation (that's handled by per-schema isolation now).

Combine with Phase 0.52 (transaction rollback) to replace `truncateAll` entirely.

---

## 0.51.7 — Migration cost per worker

Applying migrations to 46 schemas on every run adds overhead. Mitigation options:

**Option A — Template schema:** Create one `test_template` schema with migrations applied once. Each worker clones it:
```sql
CREATE SCHEMA test_<uuid> LIKE test_template  -- PostgreSQL doesn't support this directly
-- Alternative: pg_dump + pg_restore per schema (slow)
```

**Option B — Raw SQL migration:** Instead of `prisma migrate deploy` (spawns child process), run migration SQL directly via `prisma.$executeRawUnsafe`. 46 × one child process = significant overhead.

**Option C — Accept the overhead:** Migration on a fresh schema takes ~50-200ms (just DDL, no data). 46 schemas × 100ms = 4.6s of schema setup. With parallel setup this runs simultaneously → still ~100-200ms total.

**Recommendation:** Option C first. If schema setup becomes slow, switch to Option A with a pre-built template.

---

## Expected gains

| Configuration | Wall time |
|---|---|
| Current (sequential, bcrypt=12) | ~40s |
| Sequential + bcrypt=4 | ~8-12s |
| **1 worker per file + bcrypt=4 + schema isolation** | **~2-3s** |
| 1 worker per file + bcrypt=4 + transaction rollback | ~1-2s |

The 1-worker-per-file model is the target. Every new test file added costs zero additional wall time (as long as it's not slower than the current slowest file).

---

## Priority Order

1. `BCRYPT_ROUNDS=4` in `.env.test` — zero effort, 3-5x gain right now
2. Add `TEST_SCHEMA` support to `PrismaProvider`
3. `generateTestSchema` + `setupTestSchema` + `teardownTestSchema` helpers
4. Apply migrations per schema (Option C — child process, simple)
5. Add `connection_limit=1` to `DATABASE_URL` in `.env.test`
6. Flip `fileParallelism: true`, remove global setup file
7. Update each test file to call `setupTestSchema` / `teardownTestSchema` in `beforeAll`/`afterAll`
8. Run full suite — verify zero cross-file contamination
9. Measure: if schema setup overhead > 500ms, implement template schema (Option A)
