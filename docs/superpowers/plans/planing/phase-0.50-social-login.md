---
title: Phase 0.50 — Social Login (OAuth 2.0 Client)
date: 2026-08-15
status: planning
priority: low — UX improvement; prerequisite is understanding OAuth 2.0 deeply (Phase 0.49)
---

# Phase 0.50 — Social Login (OAuth 2.0 Client)

This service acts as an OAuth 2.0 **client** to external providers (Google, GitHub). Users authenticate with their existing social account — no password needed. Links social accounts to existing `Client` or `User` records.

**Prerequisite:** Phase 0.49 (deep OAuth 2.0 understanding). Phase 0.33 (email — for account linking by email when user exists).

---

## 0.50.1 — Schema

```prisma
model OAuthAccount {
  id                String   @id @default(uuid()) @db.Uuid
  provider          String   @db.VarChar(32)    // "google" | "github"
  providerAccountId String   @db.VarChar(256)   // provider's user ID

  clientId          String?  @db.Uuid
  client            Client?  @relation(fields: [clientId], references: [id])

  email             String?  @db.VarChar(254)
  name              String?  @db.VarChar(128)
  avatarUrl         String?  @db.VarChar(512)

  accessToken       String?  // provider token — for API calls if needed
  refreshToken      String?  // provider refresh token
  expiresAt         DateTime?

  createdAt         DateTime @default(now())

  @@unique([provider, providerAccountId])
  @@index([clientId])
}
```

---

## 0.50.2 — Providers

### Google

```ts
// Authorization URL:
// https://accounts.google.com/o/oauth2/v2/auth
//   ?client_id=<GOOGLE_CLIENT_ID>
//   &redirect_uri=<CALLBACK_URL>
//   &response_type=code
//   &scope=openid+email+profile
//   &state=<csrf-token>

// Token URL: https://oauth2.googleapis.com/token
// UserInfo URL: https://www.googleapis.com/oauth2/v3/userinfo
```

### GitHub

```ts
// Authorization URL:
// https://github.com/login/oauth/authorize
//   ?client_id=<GITHUB_CLIENT_ID>
//   &redirect_uri=<CALLBACK_URL>
//   &scope=user:email
//   &state=<csrf-token>

// Token URL: https://github.com/login/oauth/access_token
// UserInfo URL: https://api.github.com/user
// Email URL: https://api.github.com/user/emails (if email scope)
```

**New env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `OAUTH_CALLBACK_BASE_URL`.

---

## 0.50.3 — Routes

```
GET  /client/oauth/:provider              — redirect to provider (clientJWT optional)
GET  /client/oauth/:provider/callback     — handle code exchange
```

`:provider` = `google` | `github`. Validated against allowlist.

---

## 0.50.4 — Callback flow

1. Exchange `code` for provider access token
2. Fetch user profile from provider
3. Look up `OAuthAccount` by `(provider, providerAccountId)`
4. **Case A — account exists:** retrieve linked `Client`, create session, return tokens
5. **Case B — no account, email matches existing Client:** link new `OAuthAccount` to existing `Client`, create session
6. **Case C — completely new user:** create `Client` (no `passwordHash` — social-only account), create `OAuthAccount`, create session

**Security:** validate `state` parameter matches CSRF token stored in session cookie before processing callback.

---

## 0.50.5 — State CSRF token

```ts
// Before redirect:
const state = randomBytes(16).toString('hex')
res.cookie('oauth_state', state, { httpOnly: true, maxAge: 600_000 })
res.redirect(buildAuthorizationUrl(provider, state))

// In callback:
const savedState = req.cookies['oauth_state']
if (!savedState || savedState !== req.query.state) {
  throw new UnauthorizedError('Invalid OAuth state')
}
res.clearCookie('oauth_state')
```

---

## 0.50.6 — Account linking

**Scenario:** user has password account, wants to also log in with Google.

```
POST /client/oauth/link/:provider  — clientJWT (authenticated)
```

If provider account not yet linked → redirect to provider → callback links `OAuthAccount` to authenticated `Client`.

**Unlink:**
```
DELETE /client/oauth/link/:provider  — clientJWT
```

Block unlink if `Client` has no `passwordHash` and this is the last linked provider — would lock them out.

---

## 0.50.7 — Social-only accounts (no password)

Clients created via social login have no `passwordHash`. Implications:

- `ChangeClientPassword` — requires current password: if `passwordHash = null`, allow setting initial password instead
- `LoginClient` — if `passwordHash = null`, return error: "use social login or set a password"
- `RequestClientPasswordReset` — if `passwordHash = null`, could create a password reset flow to set initial password

Add `passwordHash String?` (nullable) to schema, or use a sentinel value. Nullable is cleaner.

---

## 0.50.8 — User social login (project-scoped)

Same pattern for `User` within a project. Project owners configure provider credentials per-project (not global):

```prisma
model ProjectOAuthConfig {
  id           String  @id @default(uuid()) @db.Uuid
  projectId    String  @unique @db.Uuid
  project      Project @relation(fields: [projectId], references: [id])

  googleClientId     String?
  googleClientSecret String?  // encrypted at rest
  githubClientId     String?
  githubClientSecret String?  // encrypted at rest
}
```

Routes:
```
GET /projects/:id/users/oauth/:provider
GET /projects/:id/users/oauth/:provider/callback
```

---

## Priority Order

1. `OAuthAccount` schema
2. `IExternalOAuthProvider` port + Google adapter
3. `/client/oauth/google` + callback (Cases A, B, C)
4. GitHub adapter
5. Account linking + unlinking
6. Social-only account edge cases
7. User social login (project-scoped)
