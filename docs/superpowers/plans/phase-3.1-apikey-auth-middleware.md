---
title: Phase 3.1 — ApiKey Authentication Middleware
date: 2026-08-03
status: done
priority: high — functional gap, user endpoints unprotected
---

# Phase 3.1 — ApiKey Authentication Middleware

API keys exist (create, rotate, rename) but nothing validates them on incoming requests. Any caller who knows a `projectId` UUID can register/login users in that project. This is a security hole, not a missing feature.

---

## Problem

User-facing endpoints have no project-level authentication:

```
POST /projects/:projectId/users/register  ← open to anyone
POST /projects/:projectId/users/login     ← open to anyone
POST /projects/:projectId/users/refresh   ← open to anyone
```

The intended flow: SDK sends `Authorization: Bearer <rawKey>` → server verifies hash matches the project's `ApiKey` record → proceeds. Currently the verification step doesn't exist.

---

## Implementation

### 1. `ApiKeyAuthMiddleware`

```ts
// src/presentation/http/middleware/ApiKeyAuthMiddleware.ts
@injectable()
export class ApiKeyAuthMiddleware {
  constructor(
    @inject(ApiKeyRepository) private readonly apiKeyRepo: ApiKeyRepository,
    @inject(PasswordHasher) private readonly hasher: PasswordHasher,
  ) {}

  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing API key')

    const rawKey = header.slice(7)
    const { projectId } = req.params

    const apiKey = await this.apiKeyRepo.findByProjectId(projectId)
    if (!apiKey || apiKey.revoked) throw new UnauthorizedError('Invalid API key')

    const valid = await this.hasher.verify(rawKey, apiKey.hash)
    if (!valid) throw new UnauthorizedError('Invalid API key')

    next()
  }
}
```

### 2. Repository gap

`ApiKeyRepository` needs:

```ts
findByProjectId(projectId: string): Promise<ApiKey | null>
```

Check if this already exists on `ProjectRepository` via `project.apiKey` join — if so, reuse it rather than a separate query.

### 3. Wire into `UserRouter`

Apply middleware only to public endpoints (register/login/refresh). Authenticated user endpoints (`/me/*`) already have `UserAuthMiddleware`.

```ts
router.post('/register', apiKeyAuth, c.register.bind(c))
router.post('/login', apiKeyAuth, c.login.bind(c))
router.post('/refresh', apiKeyAuth, c.refresh.bind(c))
```

`logout` and `/me/*` stay behind `UserAuthMiddleware` — the user JWT is sufficient there.

### 4. Bind in DI

Register `ApiKeyAuthMiddleware` in the infrastructure/presentation context. Inject into `UserRouter`.

---

## Edge Cases

- `apiKey.revoked = true` → 401 (same error as invalid key, don't leak reason)
- Project has no API key yet (was never rotated) → 401
- `projectId` in URL doesn't match the key's project → already caught (lookup is by projectId)

---

## Out of Scope

- Key scopes / permissions (read-only vs write keys) — Phase 4 idea
- Multiple keys per project — current model is 1:1, keep it
