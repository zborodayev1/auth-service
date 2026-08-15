---
title: Phase 0.38 — Account Lockout & Brute Force Protection
date: 2026-08-15
status: planning
priority: high — rate limiter by IP is insufficient; distributed credential stuffing bypasses it entirely
---

# Phase 0.38 — Account Lockout & Brute Force Protection

Current rate limiter operates per-IP. Distributed attacks from many IPs bypass it completely. This phase adds per-account lockout triggered by failed login attempts.

---

## 0.38.1 — Schema changes

Add to `Client` and `User`:

```prisma
model Client {
  // ... existing fields
  failedLoginAttempts Int      @default(0)
  lockedUntil         DateTime?
}

model User {
  // ... existing fields
  failedLoginAttempts Int      @default(0)
  lockedUntil         DateTime?
}
```

Migration: `npx prisma migrate dev --name add-account-lockout`

---

## 0.38.2 — Lockout logic

**Thresholds (exponential backoff):**

| Failed attempts | Lockout duration |
|-----------------|-----------------|
| 5               | 15 minutes       |
| 10              | 1 hour           |
| 15              | 24 hours         |
| 20+             | permanent (admin unlock required) |

**On successful login:** reset `failedLoginAttempts = 0`, `lockedUntil = null`.

**On failed login:**
1. Increment `failedLoginAttempts`
2. Calculate lockout duration from threshold table
3. Set `lockedUntil = now() + duration`

**On login attempt while locked:**
- Check `lockedUntil > now()` before password comparison
- Return `UnauthorizedError` with remaining lockout time in message
- Do NOT increment counter while locked (prevent permanent extension via spam)

---

## 0.38.3 — Commands affected

**`LoginClientHandler`** — add lockout check before `IPasswordHasher.compare()`:
```ts
if (client.lockedUntil && client.lockedUntil > new Date()) {
  throw new UnauthorizedError(`Account locked until ${client.lockedUntil.toISOString()}`)
}
```

**`LoginUserHandler`** — same pattern.

---

## 0.38.4 — Admin unlock

```
POST /client/admin/unlock  — clientJWT (owner unlocking their own; or admin role later)
POST /projects/:id/users/:userId/unlock  — apiKey (project owner unlocking a user)
```

Commands: `UnlockClientAccount`, `UnlockUserAccount` — reset `failedLoginAttempts = 0`, `lockedUntil = null`.

---

## 0.38.5 — Integration tests

**`LoginClientHandler.integration.test.ts`** additions:
- 5 wrong passwords → account locked, 6th attempt returns `UnauthorizedError` (locked)
- Correct password while locked → still `UnauthorizedError`
- Wait for lockout expiry (use `Date.now()` manipulation in test) → login succeeds
- Successful login resets counter

**`UnlockClientAccountHandler.integration.test.ts`**:
- Locked account → unlock → login succeeds

---

## Priority Order

1. Schema migration — prerequisite for everything
2. Lockout logic in `LoginClientHandler` + `LoginUserHandler`
3. Integration tests
4. Admin unlock endpoints
