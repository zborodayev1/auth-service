---
title: API Key Auth on All User Endpoints
date: 2026-08-10
status: done
---

# API Key Auth on All User Endpoints

## Context

auth-service is a server-to-server BaaS. The client library (not yet implemented) manages both the project API key and user JWTs in a single process. It handles token storage, rotation, and all requests to the auth-service on behalf of the developer's backend app.

Currently `apiKeyAuth` middleware only guards register/login/refresh. All `/me/*` and logout endpoints are guarded by `userAuth` only.

## Problem

Two gaps:

1. **Revocation is incomplete.** Revoking an API key blocks new logins but active user JWTs continue working. In a server-to-server model where the library controls everything, revocation should be immediate and total.

2. **Cross-project attack vector.** `apiKeyAuth` and `userAuth` verify independently. A caller with a valid API key from project A and a valid user JWT from project B can call `/me/*` — both checks pass, mismatch goes undetected.

## Design

### Rule

Every endpoint in `UserRouter` requires `apiKeyAuth`. No exceptions.

```
POST /register          → apiKeyAuth
POST /login             → apiKeyAuth
POST /refresh           → apiKeyAuth
POST /logout            → apiKeyAuth → userAuth
POST /logout-all        → apiKeyAuth → userAuth
GET  /me                → apiKeyAuth → userAuth
PATCH /me/email         → apiKeyAuth → userAuth
PATCH /me/password      → apiKeyAuth → userAuth
DELETE /me              → apiKeyAuth → userAuth
GET  /me/fields         → apiKeyAuth → userAuth
GET  /me/fields/:id     → apiKeyAuth → userAuth
PATCH /me/fields/:id    → apiKeyAuth → userAuth
```

### Cross-validation in `UserAuthMiddleware`

After the user JWT is verified and `payload` is decoded, add an explicit project consistency check:

```ts
if (req.projectAuth && req.projectAuth.projectId !== payload.projectId) {
  throw new UnauthorizedError('Token project mismatch')
}
```

This runs only when `apiKeyAuth` has already populated `req.projectAuth`. For the three endpoints where `apiKeyAuth` runs alone (register/login/refresh), `UserAuthMiddleware` is not in the chain so the check doesn't apply.

## Changes

| File                                                     | Change                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/presentation/http/routes/user.ts`                   | Add `authenticateApiKey` to logout, logout-all, and all /me/\* routes |
| `src/presentation/http/middleware/UserAuthMiddleware.ts` | Add 3-line cross-validation after JWT verify                          |

## Out of Scope

- Key scopes / per-endpoint permissions
- Multiple API keys per project
- Frontend (cookie-based) auth flows
