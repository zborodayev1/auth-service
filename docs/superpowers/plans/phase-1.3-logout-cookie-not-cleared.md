---
title: Phase 1.3 — Logout Does Not Clear refresh_token Cookie
date: 2026-08-03
status: backlog
priority: medium — security hygiene, easy fix
---

# Phase 2.13 — Logout Does Not Clear `refresh_token` Cookie

All logout paths revoke sessions server-side but never call `res.clearCookie('refresh_token')`. The httpOnly cookie persists in the browser for up to 30 days (configured by `COOKIE_MAX_AGE` / `REFRESH_TOKEN_TTL_MS`).

---

## Affected handlers (controller layer)

| Controller | Method | Revokes server-side | Clears cookie |
|------------|--------|---------------------|---------------|
| `UserController` | `logoutCurrent` | ✓ session revoked | ✗ |
| `UserController` | `logoutAll` | ✓ all sessions revoked | ✗ |
| `UserController` | `deleteSelf` | ✓ sessions deleted | ✗ |
| `ClientController` | `logoutCurrent` | ✓ session revoked | ✗ |
| `ClientController` | `logoutAll` | ✓ all sessions revoked | ✗ |

---

## Why it matters

Using the stale cookie after logout fails correctly — `refresh` checks session activity, session is revoked, throws `INVALID_SESSION`. No token is issued. The server-side invariant holds.

However:

1. **Client confusion** — clients that check for cookie presence to determine auth state will incorrectly think the user is still logged in.
2. **Token reuse window** — if the cookie is stolen (XSS, shared device) before logout, the attacker retains the raw token bytes. Server blocks redemption, but only because the session check happens before token rotation. If logout had cleared the cookie, the attacker's copy would stop being useful (no functional difference, but defense-in-depth).
3. **`deleteSelf`** — account is fully destroyed but the cookie remains for 30 days on the device. Any process reading that cookie will see what looks like a valid session.

The fix is two lines per method.

---

## Fix

Add `res.clearCookie('refresh_token')` to each method. Cookie options must match the original `set-cookie` attributes — mismatched `path`, `domain`, or `secure` will silently fail to clear.

```ts
// UserController.logoutCurrent / logoutAll / deleteSelf
// ClientController.logoutCurrent / logoutAll
res.clearCookie('refresh_token', {
  httpOnly: true,
  secure: this.serverConfig.isProduction,
  sameSite: 'strict',
})
// note: maxAge is NOT needed for clearCookie — setting it would be ignored anyway
```

---

## Checklist

- [ ] `UserController.logoutCurrent` — add `clearCookie` before `res.status(200).json(...)`
- [ ] `UserController.logoutAll` — same
- [ ] `UserController.deleteSelf` — same
- [ ] `ClientController.logoutCurrent` — same
- [ ] `ClientController.logoutAll` — same
- [ ] Verify cookie options match: `httpOnly: true`, `sameSite: 'strict'`, `secure` tied to `isProduction`
- [ ] Manual test: POST /logout → browser DevTools → cookie absent from response
