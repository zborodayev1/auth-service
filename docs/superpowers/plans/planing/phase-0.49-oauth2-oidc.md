---
title: Phase 0.49 — OAuth 2.0 / OIDC Provider
date: 2026-08-15
status: planning
priority: low — major scope; transforms this into a full identity platform (Auth0-equivalent); do after all prior phases stable
---

# Phase 0.49 — OAuth 2.0 / OIDC Provider

Turns the auth service into an OAuth 2.0 Authorization Server and OpenID Connect Provider. Third-party applications can delegate authentication to this service. Project owners' apps become OAuth clients — users authenticate here, not in the app.

**Prerequisite:** All prior phases stable. API surface must not change during OAuth implementation. Read the specs before writing code: RFC 6749 (OAuth 2.0), RFC 7636 (PKCE), OpenID Connect Core 1.0.

---

## 0.49.1 — Scope

This phase implements **Authorization Code Flow + PKCE** only. Implicit flow is deprecated. Client Credentials flow is a separate phase (machine-to-machine).

**Not in this phase:**
- Device Authorization Flow
- Client Credentials Flow
- Refresh token rotation for OAuth clients (separate from existing RT rotation)
- OpenID Connect Discovery (`.well-known`) — included as it's trivial once core is done

---

## 0.49.2 — Schema

```prisma
model OAuthClient {
  id           String   @id @default(uuid()) @db.Uuid
  projectId    String   @db.Uuid
  project      Project  @relation(fields: [projectId], references: [id])

  name         String   @db.VarChar(128)
  clientId     String   @unique @db.VarChar(64)   // public identifier
  clientSecret String   @db.Char(64)               // hashed (for confidential clients)
  redirectUris String[]
  scopes       String[]                             // ["openid", "profile", "email"]
  isPublic     Boolean  @default(false)             // PKCE-only, no client secret

  createdAt    DateTime @default(now())

  authCodes    AuthorizationCode[]
}

model AuthorizationCode {
  id               String   @id @default(uuid()) @db.Uuid
  oauthClientId    String   @db.Uuid
  oauthClient      OAuthClient @relation(fields: [oauthClientId], references: [id])

  userId           String   @db.Uuid
  scopes           String[]
  redirectUri      String   @db.VarChar(512)

  codeHash         String   @unique @db.Char(64)   // SHA-256 of raw code
  codeChallenge    String   @db.VarChar(128)        // PKCE S256 challenge
  codeChallengeMethod String @db.VarChar(8)         // "S256"

  expiresAt        DateTime
  usedAt           DateTime?

  createdAt        DateTime @default(now())

  @@index([oauthClientId])
}
```

---

## 0.49.3 — Endpoints

### Authorization endpoint
```
GET /oauth/authorize
  ?response_type=code
  &client_id=<clientId>
  &redirect_uri=<uri>
  &scope=openid+profile+email
  &state=<random>
  &code_challenge=<S256-challenge>
  &code_challenge_method=S256
```

Flow:
1. Validate `client_id`, `redirect_uri` (must match registered)
2. Validate `code_challenge_method = S256`
3. If user not authenticated: redirect to login page with `return_to` param
4. If authenticated but scope not yet consented: show consent screen
5. If consented: generate authorization code, redirect to `redirect_uri?code=<code>&state=<state>`

### Token endpoint
```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<raw-code>
&redirect_uri=<uri>
&client_id=<clientId>
&code_verifier=<pkce-verifier>
```

Flow:
1. Hash `code` → lookup `AuthorizationCode` by hash
2. Validate: not expired, not used, `redirect_uri` matches, `client_id` matches
3. PKCE: `BASE64URL(SHA-256(code_verifier)) == code_challenge`
4. Mark code as used
5. Issue access token (JWT) + refresh token + ID token (if `openid` scope)
6. Return:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "..."
}
```

### UserInfo endpoint
```
GET /oauth/userinfo
Authorization: Bearer <access_token>
```

Returns OIDC claims based on granted scopes:
- `openid`: `sub` (user ID)
- `profile`: `name`, `updated_at`
- `email`: `email`, `email_verified`

### Token introspection
```
POST /oauth/introspect
Authorization: Bearer <client_credentials>
Body: token=<access_token>
```

Returns `{ active: true, sub, scope, exp }` or `{ active: false }`.

### Token revocation
```
POST /oauth/revoke
Body: token=<token>
```

### OpenID Connect Discovery
```
GET /.well-known/openid-configuration
```

Returns JSON with all endpoint URLs, supported scopes, signing algorithms.

---

## 0.49.4 — ID Token (JWT)

```json
{
  "iss": "https://auth.example.com",
  "sub": "<userId>",
  "aud": "<clientId>",
  "exp": 1234567890,
  "iat": 1234567890,
  "nonce": "<nonce-from-authorize>",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name"
}
```

Signed with RS256 (asymmetric key pair) — clients can verify without calling the auth server. Publish public key at `GET /.well-known/jwks.json`.

**New env vars:** `OAUTH_PRIVATE_KEY` (RSA-2048 PEM), `OAUTH_PUBLIC_KEY`.

---

## 0.49.5 — PKCE verification

```ts
function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const computed = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(codeChallenge),
  )
}
```

`timingSafeEqual` prevents timing attacks on the PKCE verification.

---

## 0.49.6 — Consent screen

Minimal HTML page served by the auth service:

```
App "My App" is requesting access to:
  ✓ Your profile (name)
  ✓ Your email address

[Allow]  [Deny]
```

Store consent in DB — user should not be prompted again for the same client + scope combination.

```prisma
model OAuthConsent {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @db.Uuid
  oauthClientId String   @db.Uuid
  scopes        String[]
  grantedAt     DateTime @default(now())

  @@unique([userId, oauthClientId])
}
```

---

## 0.49.7 — Testing

OAuth flows are complex state machines — integration tests are essential.

**Authorization Code + PKCE flow (full):**
1. Generate code verifier + challenge
2. `GET /oauth/authorize` → redirect to login
3. `POST /client/login` → authenticated
4. `GET /oauth/authorize` again → redirect with code
5. `POST /oauth/token` with code + verifier → tokens
6. `GET /oauth/userinfo` with access token → claims

**Negative cases:**
- Invalid `code_verifier` → `invalid_grant`
- Expired code → `invalid_grant`
- Used code → `invalid_grant`
- Mismatched `redirect_uri` → `invalid_request`
- Invalid `client_id` → `invalid_client`

---

## Priority Order

1. Read RFC 6749 + RFC 7636 + OIDC Core (non-negotiable before writing code)
2. Schema: `OAuthClient` + `AuthorizationCode` + `OAuthConsent`
3. `GET /oauth/authorize` (with existing session cookie check)
4. `POST /oauth/token` (core of the flow)
5. PKCE verification
6. `GET /oauth/userinfo`
7. RS256 signing + `GET /.well-known/jwks.json`
8. `GET /.well-known/openid-configuration`
9. Consent screen (minimal HTML)
10. Integration tests
11. `POST /oauth/introspect` + `POST /oauth/revoke`
