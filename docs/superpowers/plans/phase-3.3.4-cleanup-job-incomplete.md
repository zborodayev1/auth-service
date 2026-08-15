---
title: Phase 3.3.4 — Cleanup Job Half-Built: node-cron Installed, deleteExpired() Never Called
date: 2026-08-03
status: done
priority: medium — dead code + unclear intent; must resolve before 3.4.1
---

# Phase 3.3.4 — Cleanup Job Half-Built

`node-cron` was added to `dependencies` (commit `f44710c`) and `deleteExpired()` was added to all four token/session repository interfaces and implementations. But no scheduler was created. The cleanup infrastructure is half-built and never runs.

---

## Current state

### Repository ports with `deleteExpired()`

All four define it in the domain port and have a concrete implementation:

| Port                           | Implementation                     | What it deletes           |
| ------------------------------ | ---------------------------------- | ------------------------- |
| `UserSessionRepository`        | `PrismaUserSessionRepository`      | `WHERE expiresAt < NOW()` |
| `UserRefreshTokenRepository`   | `PrismaUserRefreshTokenRepository` | presumably expired tokens |
| `ClientSessionRepository`      | `PrismaSessionRepository`          | `WHERE expiresAt < NOW()` |
| `ClientRefreshTokenRepository` | `PrismaRefreshTokenRepository`     | presumably expired tokens |

None of these are called anywhere in the application.

### `node-cron`

Installed in `dependencies`, typed in `devDependencies` (`@types/node-cron`). Zero imports in `src/`.

---

## The problem with the current state

**Dead interface methods.** `deleteExpired()` is part of the domain port contracts but has no callers. Any future implementor must implement a method that is never used. Misleads code readers into thinking cleanup is running.

**Spec 3.4.1 recommends Option A first (at-login cleanup per-user)** but the implemented infrastructure targets Option B (global periodic cleanup). They are not mutually exclusive but they have different signatures: 3.4.1 calls for `deleteExpiredByClientId(clientId)` / `deleteExpiredByUserId(userId)`, not the global `deleteExpired()`.

**The work must be completed or reverted.**

---

## Decision required

### Path A — Complete the cron job (Option B from 3.3.1)

Wire `node-cron` to call `deleteExpired()` on all four repos periodically (e.g., hourly).

```ts
// src/infrastructure/jobs/CleanupJob.ts
import cron from 'node-cron'
import type { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import type { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import type { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import type { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'

export class CleanupJob {
  constructor(
    private readonly userSessions: UserSessionRepository,
    private readonly userTokens: UserRefreshTokenRepository,
    private readonly clientSessions: ClientSessionRepository,
    private readonly clientTokens: ClientRefreshTokenRepository,
  ) {}

  start(): void {
    cron.schedule('0 * * * *', async () => {
      await this.userSessions.deleteExpired()
      await this.userTokens.deleteExpired()
      await this.clientSessions.deleteExpired()
      await this.clientTokens.deleteExpired()
    })
  }
}
```

Wire in `bootstrap.ts` after `application.start()`. Add graceful shutdown to stop the cron task (tie to `application.stop()`).

**Tradeoff:** runs globally on all records regardless of user. Under multi-instance, each instance runs the job — duplicate work, but `DELETE WHERE` is idempotent so no data corruption. Becomes a problem at scale (add distributed lock if needed).

### Path B — Revert and implement Option A (at-login cleanup per-user)

Remove `deleteExpired()` from all four repository ports. Remove from all four implementations. Remove `node-cron` from `dependencies`.

Add `deleteExpiredByUserId(userId)` / `deleteExpiredByClientId(clientId)` as per spec 3.4.1 recommendation. Call on each successful login before creating a new session.

**Tradeoff:** zero infrastructure overhead. Only cleans up for active users. But matches 3.4.1's recommendation.

---

## Recommendation

**Path A if you want cleanup to run regardless of login activity.** The code is already half-done. Complete it.

**Path B if you want zero infrastructure complexity.** Remove the dead code and follow 3.4.1.

Do not leave the current state: `deleteExpired()` in ports with no callers is misleading and `node-cron` in dependencies without a scheduler is dead weight.

---

## Checklist (Path A)

- [ ] Create `src/infrastructure/jobs/CleanupJob.ts` — inject all 4 repos, schedule hourly `deleteExpired()` calls
- [ ] Wire `CleanupJob` into DI container (bind in `PersistenceContext` or new `JobsContext`)
- [ ] Call `cleanupJob.start()` in `bootstrap.ts` after `application.start()`
- [ ] Wire shutdown: expose `stop()` on `CleanupJob`, call in `application.stop()` shutdown path (ties to 3.4.3)
- [ ] Verify `deleteExpired()` implementations are correct — check `PrismaRefreshTokenRepository` (revokedAt + usedAt rows also need cleanup, not just expired by time)

## Checklist (Path B)

- [ ] Remove `deleteExpired()` from `UserSessionRepository`, `UserRefreshTokenRepository`, `ClientSessionRepository`, `ClientRefreshTokenRepository` ports
- [ ] Remove implementations from all 4 Prisma repos
- [ ] Add `deleteExpiredByUserId(userId: string)` to `UserSessionRepository` and `UserRefreshTokenRepository`
- [ ] Add `deleteExpiredByClientId(clientId: string)` to `ClientSessionRepository` and `ClientRefreshTokenRepository`
- [ ] Call in `LoginUserHandler.execute` and `LoginClientHandler.execute` after credential verification, before session creation
- [ ] Remove `node-cron` from `dependencies`, remove `@types/node-cron` from `devDependencies`
