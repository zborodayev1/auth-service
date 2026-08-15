---
title: Phase 0.46 — Two-Factor Authentication (TOTP)
date: 2026-08-15
status: planning
priority: medium — standard expectation for any auth service used in security-conscious products
---

# Phase 0.46 — Two-Factor Authentication (TOTP)

Time-based One-Time Passwords per RFC 6238. Works with any TOTP app (Google Authenticator, Authy, 1Password). Adds a second factor to login — even a compromised password alone is insufficient.

**Prerequisite:** Phase 0.38 (account lockout — TOTP brute force must also be blocked).

---

## 0.46.1 — Schema

```prisma
model Client {
  // ... existing fields
  twoFactorSecret     String?  @db.VarChar(64)  // Base32-encoded TOTP secret
  twoFactorEnabled    Boolean  @default(false)
  twoFactorBackupCodes String[] // hashed backup codes
}

model User {
  // ... existing fields
  twoFactorSecret     String?  @db.VarChar(64)
  twoFactorEnabled    Boolean  @default(false)
  twoFactorBackupCodes String[]
}
```

`twoFactorSecret` stored encrypted at rest (use `JWT_SECRET` or a dedicated `ENCRYPTION_KEY` env var + AES-256-GCM).

---

## 0.46.2 — Library

```bash
pnpm add otplib qrcode
pnpm add -D @types/qrcode
```

`otplib` handles TOTP generation/verification per RFC 6238. `qrcode` generates QR code image for authenticator app scanning.

---

## 0.46.3 — Setup flow

**Step 1 — Generate secret:**
```
POST /client/2fa/setup  — clientJWT
```
- Generate secret: `authenticator.generateSecret()`
- Store encrypted in `client.twoFactorSecret` (NOT yet enabled)
- Return:
  ```json
  {
    "secret": "BASE32SECRET",
    "qrCodeUrl": "data:image/png;base64,..."
  }
  ```
- QR code URI: `otpauth://totp/AuthService:<email>?secret=<secret>&issuer=AuthService`

**Step 2 — Verify + enable:**
```
POST /client/2fa/verify  — clientJWT
Body: { "code": "123456" }
```
- Validate TOTP code against stored secret
- If valid: set `twoFactorEnabled = true`, generate 8 backup codes, store hashes
- Return: `{ backupCodes: ["xxxx-xxxx", ...] }` — shown once, never again

---

## 0.46.4 — Modified login flow

**Before 2FA:**
```
POST /client/login → { accessToken } + refresh cookie
```

**After 2FA enabled:**
```
POST /client/login
  → 200 { challengeToken: "short-lived JWT", requiresTwoFactor: true }

POST /client/2fa/challenge
  Body: { challengeToken, code }
  → { accessToken } + refresh cookie
```

`challengeToken` — short-lived JWT (5 min TTL), signed with `JWT_SECRET`, payload `{ clientId, type: "2fa-challenge" }`. Not a session token — cannot be used for any other endpoint.

---

## 0.46.5 — Backup codes

- 8 codes generated at 2FA setup
- Each code: `randomBytes(5).toString('hex')` = 10 hex chars, displayed as `xxxxx-xxxxx`
- Stored as SHA-256 hashes (same pattern as refresh tokens)
- One-time: mark used, cannot be reused
- Accepted at `POST /client/2fa/challenge` in place of TOTP code

**Regenerate backup codes:**
```
POST /client/2fa/backup-codes/regenerate  — clientJWT + valid TOTP code
```

---

## 0.46.6 — Disable 2FA

```
DELETE /client/2fa  — clientJWT
Body: { "code": "123456" }  // must provide valid TOTP to disable
```

Requires valid TOTP or backup code. Sets `twoFactorEnabled = false`, clears `twoFactorSecret` and `twoFactorBackupCodes`.

---

## 0.46.7 — Brute force protection

Apply account lockout (Phase 0.38) to `POST /client/2fa/challenge`:
- 5 failed TOTP attempts → lock account
- Failed attempts tracked separately from login failures (or combined — decision needed)

Rate limit: max 10 TOTP attempts per 15 minutes per account.

---

## 0.46.8 — Integration tests

**Setup flow:**
- Generate secret → QR code returned, `twoFactorEnabled = false`
- Verify with valid code → enabled, backup codes returned
- Verify with invalid code → `UnauthorizedError`

**Login flow with 2FA:**
- Login → `challengeToken` returned, no access token
- Challenge with valid TOTP → access token + session created
- Challenge with backup code → success, backup code marked used
- Challenge with used backup code → `UnauthorizedError`
- Challenge with expired `challengeToken` → `UnauthorizedError`

**Disable:**
- Disable with valid TOTP → `twoFactorEnabled = false`
- Disable with invalid code → `UnauthorizedError`

---

## Priority Order

1. Schema migration
2. Secret generation + encryption at rest
3. Setup endpoints (`/2fa/setup`, `/2fa/verify`)
4. Modified `LoginClientHandler` + `LoginUserHandler` (return challenge token)
5. `POST /client/2fa/challenge` endpoint
6. Backup codes
7. Disable endpoint
8. Integration tests
