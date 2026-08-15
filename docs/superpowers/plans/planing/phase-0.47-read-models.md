---
title: Phase 0.47 — CQRS Read Models
date: 2026-08-15
status: planning
priority: low — architectural maturity; current query approach works fine at low scale; adds real CQRS separation
---

# Phase 0.47 — CQRS Read Models

Current queries hit aggregate repositories directly — they read aggregate state and map it to DTOs. This is pragmatic but couples reads to the write model. True CQRS uses separate read models (projections) optimised for query patterns, not for domain invariants.

**Prerequisite:** Phase 0.35 (event bus Option B — projections are built from domain events), Phase 0.40 (Redis — read models can be cached there).

---

## 0.47.1 — What changes and what doesn't

**Stays the same:**
- Aggregate roots (`Client`, `Session`, etc.) — write side, unchanged
- Command handlers — unchanged
- Repository interfaces on the write side

**Changes:**
- Query handlers stop using aggregate repositories
- Instead, query handlers read from **projections** — flat, denormalized read tables or Redis hashes

---

## 0.47.2 — Projection: ActiveSessions

**Problem:** `GetClientSessionsHandler` joins `Session` + `RefreshToken` to determine "last used". With projections, this is precomputed.

**Read model table:**
```prisma
model ActiveSessionProjection {
  id          String   @id @db.Uuid
  clientId    String   @db.Uuid
  deviceName  String?
  ipAddress   String?
  userAgent   String?
  lastUsedAt  DateTime
  createdAt   DateTime

  @@index([clientId])
}
```

**Events that update this projection:**

| Event | Projection update |
|-------|------------------|
| `ClientLoggedIn` | Insert row |
| `ClientSessionRevoked` | Delete row |
| `ClientLoggedOut` | Delete row |
| `ClientLoggedOutAll` | Delete all rows for clientId |
| `RefreshTokenUsed` | Update `lastUsedAt` |

**Projection handler:**
```ts
// src/infrastructure/projections/ActiveSessionProjectionHandler.ts
@injectable()
export class ActiveSessionProjectionHandler
  implements IEventHandler<ClientLoggedInEvent>
{
  async handle(event: ClientLoggedInEvent): Promise<void> {
    await this.prisma.activeSessionProjection.upsert({
      where: { id: event.sessionId },
      create: { id: event.sessionId, clientId: event.clientId, ... },
      update: { lastUsedAt: event.occurredAt },
    })
  }
}
```

**Query handler (after):**
```ts
// GetClientSessionsHandler — reads from projection, zero joins
const sessions = await this.prisma.activeSessionProjection.findMany({
  where: { clientId: command.clientId }
})
```

---

## 0.47.3 — Redis-backed projections

For very hot reads (session validation on every request), store projection in Redis instead of a separate DB table:

```ts
// On login: write to Redis
await redis.hset(`session:${sessionId}`, {
  clientId, deviceName, ipAddress, userAgent, createdAt
})
await redis.expire(`session:${sessionId}`, SESSION_TTL_SECONDS)

// On GetClientSessions: read from Redis
const keys = await redis.keys(`session:*:client:${clientId}`)
```

Pattern: `session:<sessionId>:client:<clientId>` — enables lookup by both session ID and client ID.

**Trade-off:** Redis projections are lost on restart (unless persistence enabled). DB projections survive restarts. Use DB projections for anything that must survive a Redis restart. Use Redis projections for pure performance caching.

---

## 0.47.4 — Rebuilding projections

When you change a projection's schema, you need to rebuild from history. Two options:

**Option A — Replay domain events:** only works if events are persisted (event store). Not implemented here — would require event sourcing.

**Option B — Rebuild from write tables:** run a one-off migration script that reads from aggregate tables and populates projection tables.

```ts
// scripts/rebuild-projections.ts
const sessions = await prisma.session.findMany({
  where: { revokedAt: null, expiresAt: { gt: new Date() } }
})
for (const session of sessions) {
  await prisma.activeSessionProjection.upsert(...)
}
```

Run before deploying code that uses the new projection. In CI: run as a migration step.

---

## 0.47.5 — Which queries to project first

| Query | Complexity now | Benefit from projection |
|-------|---------------|------------------------|
| `GetClientSessions` | Medium (filter expired/revoked) | High — replaces conditional query |
| `GetUserSessions` | Medium | High |
| `GetProjectFields` | Low | Low — already fast |
| `GetUserFieldValues` | Low-medium | Medium |

Start with `GetClientSessions` — it's the most complex and benefits most from a flat read model.

---

## Priority Order

1. Decide: DB projection vs Redis projection for `ActiveSessions`
2. Create `ActiveSessionProjection` table (or Redis schema)
3. `ActiveSessionProjectionHandler` subscribed to session events
4. Update `GetClientSessionsHandler` to read from projection
5. Rebuild script
6. Repeat pattern for `GetUserSessions`
