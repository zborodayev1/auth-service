---
title: Phase 0.45 — Magic Link / Passwordless Auth
date: 2026-08-15
status: planning
priority: low — nice UX improvement; shares all infrastructure with Phase 0.33 (password reset tokens)
---

# Phase 0.45 — Magic Link / Passwordless Auth

Users authenticate via a one-time link sent to their email. No password required. Shares token infrastructure (SHA-256 hash, TTL, one-time use) with Phase 0.33.

**Prerequisite:** Phase 0.33 (email service + one-time token pattern).

---

## 0.45.1 — Schema

```prisma
model MagicLinkToken {
  id        String   @id @default(uuid()) @db.Uuid
  clientId  String   @db.Uuid
  client    Client   @relation(fields: [clientId], references: [id])
  hash      String   @unique @db.Char(64)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([clientId])
}

model UserMagicLinkToken {
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

TTL: 15 minutes (shorter than password reset — magic links are login credentials).

---

## 0.45.2 — Commands (Client)

**`RequestClientMagicLink`**
- Input: `{ email: string }`
- Lookup client by email; if not found → 200 anyway (no enumeration)
- Delete previous unused tokens for this client
- Generate raw token (`randomBytes(32).toString('hex')`)
- Store hash + TTL
- `IEmailService.sendMagicLinkEmail(email, rawToken)`
- Return: `void`

**`ConfirmClientMagicLink`**
- Input: `{ token: string, userAgent?: string, ipAddress?: string, deviceName?: string }`
- Hash token → lookup by hash
- Validate: exists, not expired, not used
- Invalid → `UnauthorizedError`
- Create session (same as `LoginClientHandler`)
- Mark token as used
- Return: `{ accessToken }` + set refresh token cookie

---

## 0.45.3 — Routes

```
POST /client/magic-link/request   — no auth, rate limited
POST /client/magic-link/confirm   — no auth, rate limited
```

Same rate limiter as `/client/login`.

User equivalents:
```
POST /projects/:id/users/magic-link/request   — apiKey
POST /projects/:id/users/magic-link/confirm   — apiKey
```

---

## 0.45.4 — Email template

```
Subject: Your login link for Auth Service

Click to sign in (expires in 15 minutes):
<link>

If you didn't request this, ignore this email.
```

URL format: `https://your-app.com/auth/magic?token=<rawToken>`

The frontend handles the redirect — calls `POST /client/magic-link/confirm` with the token from the URL query param.

---

## 0.45.5 — Security considerations

- Token is a 32-byte random value — 256 bits of entropy, brute force infeasible
- Only the SHA-256 hash stored in DB — token theft from DB useless
- 15-minute TTL — short window minimizes phishing window
- One-time — used token cannot be replayed
- Rate limit on `/request` — prevents email flooding
- Apply account lockout (Phase 0.38) on `/confirm` failures

---

## 0.45.6 — Integration tests

**`RequestClientMagicLinkHandler`:**
- Valid email → token in DB, email sent (mock `IEmailService`)
- Non-existent email → no error, no token
- Second request → previous token deleted

**`ConfirmClientMagicLinkHandler`:**
- Valid token → session created, access token returned
- Expired token → `UnauthorizedError`
- Already-used token → `UnauthorizedError`
- After confirm: token marked `usedAt`

---

## Priority Order

1. `IEmailService.sendMagicLinkEmail` method (extend from 0.33)
2. Schema + `MagicLinkToken` aggregate
3. `RequestClientMagicLink` + `ConfirmClientMagicLink` commands
4. HTTP routes
5. User equivalents
6. Integration tests
