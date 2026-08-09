---
title: Phase 3.3 — Operational Reliability
date: 2026-08-03
status: backlog
priority: medium — not blocking pre-launch, but required before sustained production traffic
---

# Phase 3.4 — Operational Reliability

Three independent problems that surface under production load. Neither requires architectural overhaul now, but all need a clear resolution path before scaling.

---

## 3.4.0 — SchemaBuilderService Cache Not Shared Between Instances

**Problem:** `SchemaBuilderService` stores Zod schemas in process memory (`Map<projectId, ZodObject>`). On multi-instance deploy, `invalidate(projectId)` only clears the cache on the mutating instance. Other instances serve stale schema → `RegisterUser` may accept or reject fields incorrectly.

**Fix:** Redis pub/sub for cache invalidation. When any instance calls `invalidate(projectId)`, it publishes `invalidate:<projectId>`. All instances subscribe and clear their local cache entry.

**Not a problem for single-instance.** Defer until horizontal scaling is needed or Redis is introduced for other reasons (e.g. 3.4.1 distributed lock).

---

## 3.4.1 — Token & Session Cleanup

**Problem:** expired/revoked rows accumulate indefinitely in four tables:

| Table | Dead rows accumulate when |
|-------|--------------------------|
| `Session` | `expiresAt` passed or `revokedAt` set |
| `RefreshToken` | `usedAt` set (token rotated) or `revokedAt` set or `expiresAt` passed |
| `UserSession` | `expiresAt` passed or `revokedAt` set |
| `UserRefreshToken` | `usedAt` set or `revokedAt` set or `expiresAt` passed |

These tables are on the hot path of every auth request. As they grow, index scans slow down even when queries filter to active rows.

---

### Options

**Option A — At-login cleanup (lazy, per-user)**

On each successful login, delete expired rows for that `clientId` / `userId` before creating new ones. Zero infrastructure: no scheduler, no cron, no background worker.

Tradeoff: cleanup only happens for active users. Inactive accounts' tokens accumulate forever. Works fine for small-to-medium user counts.

**Option B — Scheduled background job (proactive, global)**

A periodic job (e.g., every hour) runs a bulk `DELETE WHERE expiresAt < NOW() OR revokedAt IS NOT NULL`. Runs independently of traffic.

Tradeoff: needs a job scheduler or a cron entry. If the service is multi-instance, only one instance should run it (requires distributed lock or external scheduler). More infrastructure complexity.

**Option C — DB-level TTL via pg_partman / table partitioning**

Partition `Session`, `RefreshToken`, etc. by time range. Drop old partitions instead of deleting rows — extremely cheap at scale.

Tradeoff: significant schema change. Over-engineered for current scale.

---

### Recommendation

**Start with Option A (at-login cleanup), plan for Option B when user count reaches ~100k.**

At-login cleanup is zero-overhead on infra, covers the active-user case (which is 99% of real traffic), and ships in 1–2 hours. Add it to `LoginClientHandler` and `LoginUserHandler`:

```ts
// After successful credential verification, before creating session:
await this.sessions.deleteExpiredByClientId(clientId)
```

Repository additions needed:

```ts
// ClientSessionRepository
deleteExpiredByClientId(clientId: string): Promise<void>
// → DELETE WHERE clientId = $1 AND (expiresAt < NOW() OR revokedAt IS NOT NULL)
// also cascade-delete associated RefreshTokens (or add deleteExpiredBySessionIds)

// UserSessionRepository
deleteExpiredByUserId(userId: string): Promise<void>
// → same pattern
```

**When to add Option B:** add a `CleanupJob` class under `src/infrastructure/jobs/` when you introduce process management (PM2, k8s). The job itself is a trivial `DELETE WHERE` — the hard part is the scheduler. Don't solve that problem prematurely.

---

## 3.4.2 — Schema Cache Invalidation Across Instances

**Problem:** `SchemaBuilderService` holds a `Map<projectId, ZodSchema>` in process memory. Cache is invalidated via `schemaBuilder.invalidate(projectId)` — but this only affects the calling process. On 2+ instances:

- Instance A: client adds field "phone" to project X → cache invalidated on A
- Instance B: next `RegisterUser` for project X → cache returns stale schema without "phone" → "phone" field silently dropped or validation passes when it should fail

This is a correctness bug under horizontal scaling, not just a performance issue.

---

### Options

**Option A — Remove the cache (simplest)**

Drop the `Map` entirely. Every `RegisterUser` / validation call loads fields from DB. Adds 1 DB query per registration.

Tradeoff: no coordination needed, zero complexity. Query cost is acceptable when registration volume is low-to-medium. Cache was added as an optimization — if the DB can handle it, this is the right default.

**Option B — Redis pub/sub invalidation**

On field mutation (add/update/delete), publish `{ projectId }` to a Redis channel. All instances subscribe and call `schemaBuilder.invalidate(projectId)` on receive.

Tradeoff: requires Redis. But rate limiting (Phase 3.3.1 at scale) will already need Redis, so the dependency isn't new if Redis lands anyway. Still — pub/sub is stateful and needs care around reconnects and missed messages.

**Option C — Cache with short TTL (staleness-tolerant)**

Replace the indefinite `Map` with a TTL-based cache (e.g., 30s). After 30s, schema is reloaded from DB automatically. Schema mutations are eventually consistent within one TTL window.

Tradeoff: inconsistency window is bounded. For a field being required with no default, a 30s window where registration silently skips it is a real bug. For an optional new field, 30s is fine. TTL must be chosen carefully per field semantics — too nuanced.

---

### Recommendation

**Option A in the short term. Option B when Redis is already in the stack.**

The cache was added (commit `9678727`) specifically as an optimization. Removing it reverts to the correct behavior. Add it back only as a Redis-backed cache when:
1. Redis is present (rate limiting at scale, or session store)
2. Registration volume creates measurable DB pressure

**Implementation (Option A):**

```ts
// SchemaBuilderService.ts
buildForProject(
  projectId: string,
  fields: ProjectFieldDefinition[],
): z.ZodObject<Record<string, z.ZodType>> {
  // just build and return — no cache
  return this.build(fields)
}
```

Remove `private readonly cache` and `invalidate()`. Remove all `schemaBuilder.invalidate(projectId)` calls in handlers. Remove `SchemaBuilderService` injection from `AddProjectFieldHandler`, `UpdateProjectFieldHandler`, `DeleteProjectFieldHandler`.

**When moving to Option B:** design a `SchemaCache` port (interface) with `get(projectId)`, `set(projectId, schema)`, `invalidate(projectId)`. Implement as `RedisSchemaCache` and `NoopSchemaCache`. Inject via DI. Handlers continue to call `invalidate()` — the implementation decides how to propagate.

---

## 3.4.3 — No Graceful Shutdown

**Problem:** No `process.on('SIGTERM')` or `process.on('SIGINT')` handlers anywhere. `Application.stop()` exists but is never called.

On SIGTERM (Docker stop, k8s pod eviction, PM2 restart):
- HTTP server keeps accepting new requests until process is killed
- In-flight requests are aborted mid-response
- `pg.Pool` connections are never closed → PostgreSQL sees abrupt disconnects, must wait for TCP timeout to reclaim connections
- Prisma never calls `$disconnect()`

**Fix:** wire signal handlers in `bootstrap.ts` or `main.ts`:

```ts
const application = Bootstrap.bootstrap()
await application.start()

const shutdown = async () => {
  await application.stop()   // closes http.Server
  await prisma.$disconnect() // closes pg Pool
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

`Application.stop()` already closes the HTTP server and waits for in-flight requests to finish. Only missing: signal wiring and Prisma disconnect.

**Note:** `PrismaProvider` needs to expose `$disconnect()`, or `PersistenceContext` needs to hold a reference to the provider for shutdown use.

---

## Priority Order

1. **3.4.1 Option A** (at-login cleanup) — ship first, ~2h, zero infra
2. **3.4.2 Option A** (remove cache) — ship same phase, ~30min
3. **3.4.3** (graceful shutdown) — ~1h, required before any containerized deploy
4. **3.4.1 Option B + 3.4.2 Option B** — revisit when Redis enters the stack
