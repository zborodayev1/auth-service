---
title: Phase 0.3 — Historical: Critical Improvements (superseded)
date: 2026-07-22
status: planned
priority: high — implement before production
---

# Phase 1.5 — Critical Improvements

Must-do improvements after Phase 1 (step 9) is complete but before production use. These are not features — they are correctness and safety gaps.

---

## Prisma Transactions

**Problem:** Several handlers do multiple writes that must be atomic. Currently they are not — a failure between two writes leaves the DB in an inconsistent state.

**Affected handlers:**

| Handler | Writes | Risk if partial |
|---------|--------|----------------|
| `RegisterUserHandler` | `users.save` + `fieldValues.saveMany` | User created without field values |
| `DeleteProjectFieldHandler` (force) | `fieldValues.deleteByFieldId` + `projectFields.delete` | Values deleted, field still exists (or FK error) |
| `UserAuthService.login` | `sessions.save` + `refreshTokens.save` | Session without refresh token |
| `ClientAuthService.login` | `sessions.save` + `refreshTokens.save` | Same |

**Implementation:**
- Pass Prisma `$transaction` context through to repositories
- Options: (a) expose `prisma.$transaction` in handlers directly, (b) wrap PrismaProvider with a `withTransaction(fn)` helper, (c) Unit of Work pattern
- Recommended: `withTransaction` helper on `PrismaProvider` — least invasive

**Example pattern:**
```ts
await this.prisma.withTransaction(async (tx) => {
  await this.users.save(user, tx)
  await this.fieldValues.saveMany(values, tx)
})
```
