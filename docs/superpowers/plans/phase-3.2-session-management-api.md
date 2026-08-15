---
title: Phase 3.2 — Session Management API
date: 2026-08-03
status: done
priority: low — functional gap, not a bug
---

# Phase 3.2 — Session Management API

`ClientSession` and `UserSession` already store `deviceName`, `ipAddress`, `userAgent`, `createdAt` — clearly intended for display. No endpoints expose this data. No way to selectively revoke a non-current session.

Current state:

- `POST /clients/logout` — revokes current session only (from JWT `sessionId`)
- `POST /clients/logout-all` — revokes all sessions
- No middle ground: can't list sessions, can't revoke one specific other session

Same gap exists for user sessions.

---

## Checklist

### Client sessions

- [ ] `GET /clients/sessions` — list all active client sessions
  - Return: `id`, `deviceName`, `ipAddress`, `userAgent`, `createdAt`, flag for current session (match against `req.auth.sessionId`)
  - Only active sessions (`revokedAt IS NULL`, `expiresAt > now`)
- [ ] `DELETE /clients/sessions/:sessionId` — revoke a specific session by id
  - Must verify session belongs to `req.auth.clientId` before revoking
  - Cannot revoke the current session via this endpoint (use `/logout` for that)

### User sessions

- [ ] `GET /user/sessions` — list all active user sessions
  - Same shape as client sessions
- [ ] `DELETE /user/sessions/:sessionId` — revoke a specific user session by id
  - Must verify session belongs to `req.userAuth.userId`
  - Cannot revoke the current session via this endpoint

### Repository changes

- [ ] `ClientSessionRepository` — add `findAllActiveByClientId(clientId): Promise<ClientSession[]>`
- [ ] `ClientSessionRepository` — add `findByIdAndClientId(id, clientId): Promise<ClientSession | null>` (for ownership check on delete)
- [ ] `UserSessionRepository` — add `findAllActiveByUserId(userId): Promise<UserSession[]>`
- [ ] `UserSessionRepository` — add `findByIdAndUserId(id, userId): Promise<UserSession | null>`

### Application layer

- [ ] `GetClientSessionsQuery` + `GetClientSessionsHandler`
- [ ] `RevokeClientSessionCommand` + `RevokeClientSessionHandler`
- [ ] `GetUserSessionsQuery` + `GetUserSessionsHandler`
- [ ] `RevokeUserSessionCommand` + `RevokeUserSessionHandler`

### Presentation layer

- [ ] Add routes to `ClientRouter`: `GET /sessions`, `DELETE /sessions/:sessionId`
- [ ] Add routes to `UserRouter`: `GET /sessions`, `DELETE /sessions/:sessionId`
- [ ] Add methods to `ClientController` and `UserController`
- [ ] Add Zod validators for `sessionId` param

### DI

- [ ] Bind new handlers in their respective contexts
