---
title: Phase 1.1 — JWT Issuer Mismatch (Critical)
date: 2026-08-03
status: done
priority: critical — breaks all client-authenticated endpoints
---

# Phase 2.8 — JWT Issuer Mismatch

Single bug, two lines apart. Confirmed by running `jwt.verify` with the same args — throws `"jwt issuer invalid. expected: auth-system"`.

---

## The Bug

**File:** `src/infrastructure/jwt/JwtClientAccessTokenService.ts`

`sign` does not set `iss` claim:
```ts
jwt.sign({ sub: clientId, sid: sessionId }, this.config.jwtSecret, { expiresIn })
```

`verify` checks `issuer: 'auth-system'`:
```ts
jwt.verify(token, this.config.jwtSecret, { algorithms: ['HS256'], issuer: 'auth-system' })
```

`jsonwebtoken` throws `JsonWebTokenError` when `iss` is missing and `issuer` option is set. `JsonWebTokenError` is not `AppError` → error handler returns 500 "Internal server error".

---

## Blast Radius

Every endpoint behind `ClientAuthMiddleware` is broken:

- `GET /clients/me`
- `GET /clients/projects`
- `PATCH /clients/name`, `/email`, `/password`
- `POST /clients/logout`, `/logout-all`
- All `POST/GET/PATCH/DELETE /projects/*`

`JwtUserAccessTokenService` is not affected — it does not use `issuer` option in verify.

---

## Checklist

- [ ] Decide: add `iss` to `sign` or remove `issuer` from `verify`
- [ ] Fix `JwtClientAccessTokenService` accordingly
- [ ] Verify `ClientAuthMiddleware` returns 401 (not 500) on bad token after fix
- [ ] Check if `ValidationError` thrown by `JwtClientAccessTokenService.verify` is caught correctly after fix (it throws its own `ValidationError` on malformed payload — that IS an `AppError`, so it returns correctly; only the `JsonWebTokenError` from `jwt.verify` itself is the problem)
