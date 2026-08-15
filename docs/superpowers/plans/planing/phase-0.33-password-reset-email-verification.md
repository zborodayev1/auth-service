---
title: Phase 0.33 — Password Reset & Email Verification
date: 2026-08-15
status: planning
priority: high — blocker for production; no auth service ships without password reset
---

# Phase 0.33 — Password Reset & Email Verification

Two features that every real auth service must have. Both share the same infrastructure: short-lived one-time tokens, email delivery, expiry enforcement. Implement password reset first — it is the more critical path. Email verification shares the same abstractions.

This phase introduces a new infra dependency: **email provider**. Choose before implementing.

---

## Email Provider Options

| Option | Complexity | Cost | Notes |
|--------|-----------|------|-------|
| **Resend** | Low | Free tier generous | Modern API, TS-first SDK |
| **Nodemailer + SMTP** | Medium | Free (own SMTP) | Battle-tested, more setup |
| **AWS SES** | Medium | Cheap at scale | Good if AWS stack already |

**Recommendation:** Resend for development speed. Abstract behind `IEmailService` port — swap later without touching domain.

---

## New Domain / Infra pieces

### Port
```ts
// src/domain/ports/email/IEmailService.ts
export interface IEmailService {
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendEmailVerificationEmail(to: string, token: string): Promise<void>
}
```

### Token strategy
- 32-byte cryptographically random token (`randomBytes(32).toString('hex')`)
- Store **SHA-256 hash** in DB (never plaintext) — same pattern as API keys and refresh tokens
- TTL: 15 minutes for password reset, 24 hours for email verification
- One-time: mark `usedAt` on consumption; reject if already used or expired

---

## 0.33.1 — Password Reset (Client)

### Schema additions

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  clientId  String   @db.Uuid
  client    Client   @relation(fields: [clientId], references: [id])
  hash      String   @unique @db.Char(64)  // SHA-256 of raw token
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([clientId])
}
```

**Migration:** `npx prisma migrate dev --name add-password-reset-token`

### Commands

**`RequestClientPasswordReset`**
- Input: `{ email: string }`
- Lookup client by email; if not found → return 200 anyway (no user enumeration)
- Delete previous unused tokens for this client (one active token at a time)
- Generate raw token, store hash + TTL in DB
- Call `IEmailService.sendPasswordResetEmail(email, rawToken)`
- Return: `void` (always 200)

**`ResetClientPassword`**
- Input: `{ token: string, newPassword: string }`
- Hash incoming token; lookup by hash
- Validate: exists, not expired (`expiresAt > now()`), not used (`usedAt IS NULL`)
- If invalid → `UnauthorizedError` ("Invalid or expired token")
- Hash new password via `IPasswordHasher`
- Update `client.passwordHash`
- Mark token as used (`usedAt = now()`)
- Revoke all existing sessions for this client (password changed → invalidate all active sessions)
- Return: `void`

### Routes

```
POST /client/password-reset/request   — no auth
POST /client/password-reset/confirm   — no auth
```

Apply `authRateLimiter` to both endpoints.

### Integration tests

**`RequestClientPasswordResetHandler.integration.test.ts`**
- Valid email → token created in DB, email sent (mock `IEmailService`)
- Non-existent email → no error, no token, still 200
- Second request → previous token deleted, new token created

**`ResetClientPasswordHandler.integration.test.ts`**
- Valid token → password updated, token marked used, sessions revoked
- Expired token → `UnauthorizedError`
- Already-used token → `UnauthorizedError`
- Non-existent token → `UnauthorizedError`
- After reset: old password rejected on login, new password accepted

---

## 0.33.2 — Password Reset (User)

Same pattern as 0.33.1, scoped to `User` within a project context.

```prisma
model UserPasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  hash      String   @unique @db.Char(64)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

Routes:
```
POST /projects/:projectId/users/password-reset/request  — apiKey only
POST /projects/:projectId/users/password-reset/confirm  — apiKey only
```

**Key difference from client:** The project's `IEmailService` context — the Client (project owner) may want to send branded emails. Consider passing `projectId` to email service so it can template accordingly.

---

## 0.33.3 — Email Verification (Client)

### Schema addition

```prisma
model Client {
  // ... existing fields
  emailVerified Boolean  @default(false)
  emailVerifiedAt DateTime?
  emailVerificationTokens EmailVerificationToken[]
}

model EmailVerificationToken {
  id        String   @id @default(uuid()) @db.Uuid
  clientId  String   @db.Uuid
  client    Client   @relation(fields: [clientId], references: [id])
  hash      String   @unique @db.Char(64)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([clientId])
}
```

### Commands

**`SendClientEmailVerification`**
- Called automatically after `RegisterClient` (or on explicit request)
- Generate token, store hash, send email
- Idempotent: if already verified, no-op

**`VerifyClientEmail`**
- Input: `{ token: string }`
- Hash token → lookup → validate expiry + used
- Set `client.emailVerified = true`, `client.emailVerifiedAt = now()`
- Mark token used

### Routes

```
POST /client/verify-email/send     — clientJWT (or no auth with email param)
POST /client/verify-email/confirm  — no auth (token in body)
```

### Decision: enforce email verification?

**Option A:** Soft — track verified status, expose in profile, do not block login.
**Option B:** Hard — block login until verified.

**Recommendation:** Start with Option A. Hard blocking before verification is annoying during development and requires resend flow. Upgrade to Option B when launching publicly.

---

## Cleanup (both tokens)

Add to `CleanupJob`:
```ts
// Delete expired, unused password reset tokens older than 24h
await prisma.passwordResetToken.deleteMany({
  where: { expiresAt: { lt: new Date() }, usedAt: null }
})
// Same for UserPasswordResetToken, EmailVerificationToken
```

---

## Priority Order

1. `IEmailService` port + Resend adapter (shared infra, unblocks everything)
2. `RequestClientPasswordReset` + `ResetClientPassword` — most critical user path
3. `RequestUserPasswordReset` + `ResetUserPassword` — same, for user context
4. Email verification (Client) — important but not a hard blocker
5. Email verification (User) — lowest priority, same pattern
