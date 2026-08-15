---
title: Phase 0.39 — Audit Log
date: 2026-08-15
status: planning
priority: medium — required for compliance and security incident investigation
---

# Phase 0.39 — Audit Log

Write-only append log of security-relevant events. Never updated, never deleted (soft TTL via archival only). Enables post-incident investigation and compliance reporting.

---

## 0.39.1 — Schema

```prisma
enum AuditAction {
  login_success
  login_failed
  logout
  logout_all
  password_changed
  email_changed
  account_locked
  account_unlocked
  password_reset_requested
  password_reset_completed
  email_verification_sent
  email_verified
  session_revoked
  two_factor_enabled
  two_factor_disabled
  two_factor_challenged
  api_key_created
  api_key_revoked
}

model AuditLog {
  id         String      @id @default(uuid()) @db.Uuid
  actorId    String      @db.Uuid
  actorType  String      @db.VarChar(16)  // "client" | "user"
  action     AuditAction
  projectId  String?     @db.Uuid
  ipAddress  String?     @db.VarChar(45)  // IPv6 max length
  userAgent  String?     @db.VarChar(512)
  metadata   Json?
  createdAt  DateTime    @default(now())

  @@index([actorId, actorType])
  @@index([createdAt])
  @@index([projectId])
}
```

Migration: `npx prisma migrate dev --name add-audit-log`

---

## 0.39.2 — Port

```ts
// src/domain/ports/audit/IAuditLogger.ts
export interface AuditEntry {
  actorId: string
  actorType: 'client' | 'user'
  action: AuditAction
  projectId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export interface IAuditLogger {
  log(entry: AuditEntry): Promise<void>
}
```

Inject into handlers that perform security-relevant mutations. Never throw on failure — wrap in try/catch, log error to Pino but don't block the main operation.

---

## 0.39.3 — Handlers to instrument

| Handler | Action |
|---------|--------|
| `LoginClientHandler` (success) | `login_success` |
| `LoginClientHandler` (wrong password) | `login_failed` |
| `LoginClientHandler` (locked) | `login_failed` + metadata: `{ locked: true }` |
| `LogoutCurrentClientSessionHandler` | `logout` |
| `LogoutAllClientSessionsHandler` | `logout_all` |
| `ChangeClientPasswordHandler` | `password_changed` |
| `ChangeClientEmailHandler` | `email_changed` |
| `RevokeClientSessionHandler` | `session_revoked` |
| `ResetClientPasswordHandler` | `password_reset_completed` |
| `RequestClientPasswordResetHandler` | `password_reset_requested` |
| User equivalents | same |

---

## 0.39.4 — Query endpoint

```
GET /client/audit-log?limit=50&before=<cursor>  — clientJWT
```

Cursor-based pagination (not offset). Returns events for the authenticated client only.

```
GET /projects/:id/users/:userId/audit-log  — apiKey + admin scope (future)
```

---

## 0.39.5 — ipAddress + userAgent in commands

Handlers need access to `ipAddress` and `userAgent` from the HTTP request. Options:

**Option A** — include in command payload (current pattern for login commands that already have `userAgent`):
```ts
// LoginClientCommand already has userAgent, ipAddress — extend others
```

**Option B** — pass via AsyncLocalStorage context (cleaner for handlers deep in stack).

**Recommendation:** Option A for now. Controllers already extract these from `req`. Extend command interfaces that are missing them.

---

## Priority Order

1. Schema + `IAuditLogger` port + Prisma implementation
2. Instrument login/logout handlers (highest security value)
3. Instrument password/email change handlers
4. `GET /client/audit-log` endpoint
5. Session revoke + password reset instrumentation
