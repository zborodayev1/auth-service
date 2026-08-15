---
title: Phase 0.32 — Missing Test Coverage
date: 2026-08-15
status: done
priority: high — four handlers ship with no tests; presentation layer completely uncovered
---

# Phase 0.32 — Missing Test Coverage

Two separate gaps. First: four handlers that exist but have no test files. Second: the entire presentation layer (controllers, routes, middleware, validators) has zero coverage — no HTTP-level testing at all.

---

## 0.32.1 — GetClientSessions integration test

**Problem:** `GetClientSessionsHandler` has no test. Session query is non-trivial: must return only active (non-revoked, non-expired) sessions, include device metadata.

**File to create:** `src/application/queries/client/GetClientSessions/GetClientSessionsHandler.integration.test.ts`

**Scenarios:**

- Returns empty list when client has no sessions
- Returns active sessions with correct fields (id, deviceName, ipAddress, userAgent, lastUsedAt, createdAt)
- Excludes revoked sessions (`revokedAt IS NOT NULL`)
- Excludes expired sessions (`expiresAt < NOW()`)
- Returns only sessions belonging to the querying client (isolation)

---

## 0.32.2 — GetUserSessions integration test

**Problem:** `GetUserSessionsHandler` has no test. Same concerns as 0.32.1 but for users scoped to a project.

**File to create:** `src/application/queries/user/GetUserSessions/GetUserSessionsHandler.integration.test.ts`

**Scenarios:**

- Returns empty list when user has no sessions
- Returns active sessions only
- Excludes revoked + expired sessions
- Scoped to the user — does not return sessions from other users in the same project

---

## 0.32.3 — RevokeClientSession integration test

**Problem:** `RevokeClientSessionHandler` has no test. Revoke is a security-critical mutation — silent regression here is dangerous.

**File to create:** `src/application/commands/client/RevokeClientSession/RevokeClientSessionHandler.integration.test.ts`

**Scenarios:**

- Revokes target session (`revokedAt` set)
- All refresh tokens under that session are revoked
- Does not affect other sessions of the same client
- Returns `NotFoundError` for non-existent session id
- Returns `UnauthorizedError` when client does not own the session

---

## 0.32.4 — RevokeUserSession integration test

**Problem:** `RevokeUserSessionHandler` has no test. Same as 0.32.3 but for user sessions.

**File to create:** `src/application/commands/user/RevokeUserSession/RevokeUserSessionHandler.integration.test.ts`

**Scenarios:**

- Revokes target session
- All user refresh tokens under that session are revoked
- Does not affect other sessions of the same user
- Returns `NotFoundError` for non-existent session
- Returns `UnauthorizedError` when user does not own the session

---

## 0.32.5 — HTTP / presentation layer tests

**Problem:** Controllers, routes, middleware, and Zod validators are never tested. This is the largest uncovered surface: routing bugs, auth middleware misconfiguration, validator field mismatch, wrong HTTP status codes — all invisible to the test suite.

**Approach:** `supertest` against a real Express app instance with a real test DB (same pattern as integration tests). Do not mock the DI container.

**Setup:**

```ts
// src/tests/helpers/app.ts
import { createApp } from '@infra/http/ExpressApp'

export async function getTestApp() {
  const container = await buildTestContainer()
  return createApp(container)
}
```

**Test files to create:**

### Client routes

**File:** `src/presentation/http/routes/client.http.test.ts`

| Scenario                                 | Expected                        |
| ---------------------------------------- | ------------------------------- |
| `POST /client/register` valid body       | 201, returns `{ accessToken }`  |
| `POST /client/register` duplicate email  | 409                             |
| `POST /client/register` missing fields   | 400                             |
| `POST /client/login` valid credentials   | 200, sets `refreshToken` cookie |
| `POST /client/login` wrong password      | 401                             |
| `POST /client/refresh` valid cookie      | 200, new tokens                 |
| `POST /client/refresh` no cookie         | 401                             |
| `PATCH /client/email` with valid JWT     | 200                             |
| `PATCH /client/email` no JWT             | 401                             |
| `POST /client/logout` with valid JWT     | 200, clears cookie              |
| `POST /client/logout-all` with valid JWT | 200                             |

### User routes

**File:** `src/presentation/http/routes/user.http.test.ts`

| Scenario                                            | Expected |
| --------------------------------------------------- | -------- |
| `POST /projects/:id/users/register` valid apiKey    | 201      |
| `POST /projects/:id/users/register` invalid apiKey  | 401      |
| `POST /projects/:id/users/login` valid credentials  | 200      |
| `POST /projects/:id/users/me` with apiKey + userJWT | 200      |
| `POST /projects/:id/users/me` missing userJWT       | 401      |
| `POST /projects/:id/users/me` revoked apiKey        | 401      |

### Middleware

**File:** `src/presentation/http/middleware/ApiKeyAuthMiddleware.http.test.ts`

- Missing `Authorization` header → 401
- `Authorization: Bearer invalid` → 401
- Revoked API key → 401
- Valid API key → passes, attaches project to request

**Note:** Rate limiter must be disabled or threshold raised in test config — use `TEST_RATE_LIMIT=false` env flag or inject a no-op limiter.

---

## Priority Order

1. `RevokeClientSession` + `RevokeUserSession` tests — security-critical, low effort
2. `GetClientSessions` + `GetUserSessions` tests — low effort, completes query coverage
3. HTTP tests — highest effort, highest value; start with client routes
