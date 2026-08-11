---
title: Phase 0.21 — ApiKey Auth on All User Endpoints
date: 2026-08-10
status: done
priority: high — cross-project JWT attack, incomplete apiKey enforcement
---

# Phase 0.21 — ApiKey Auth on All User Endpoints

**Goal:** Require API key on every user endpoint so that revoking a key immediately blocks all access and prevents cross-project JWT attacks.

**Architecture:** Two surgical edits — add `authenticateApiKey` as the first middleware on all routes in `UserRouter`, then add a cross-validation guard in `UserAuthMiddleware` to ensure the API key's project matches the user JWT's project.

**Tech Stack:** Express 5, TypeScript, InversifyJS, tsup build.

## Global Constraints

- No test infrastructure yet (phase 3.5). Verification = `pnpm typecheck` + manual curl.
- Never mutate aggregates in place — not relevant here but noted for context.
- Project path aliases: `@shared/*` → `src/shared/*`, `@ports/*` → `src/domain/ports/*`.

---

### Task 1: Cross-validation in `UserAuthMiddleware`

**Files:**

- Modify: `src/presentation/http/middleware/UserAuthMiddleware.ts:36-51`

**Interfaces:**

- Consumes: `req.projectAuth: { projectId: string }` set by `ApiKeyAuthMiddleware` (may or may not be present depending on route)
- Produces: throws `UnauthorizedError('Token project mismatch')` when both are present and projectIds differ

- [x] **Step 1: Add cross-validation after JWT verify**

In `UserAuthMiddleware.ts`, after line 36 (`const payload = this.accessTokens.verify(...)`), add the check before the session lookup:

```ts
const payload = this.accessTokens.verify(token, project.jwtSecret)

if (req.projectAuth && req.projectAuth.projectId !== payload.projectId) {
  throw new UnauthorizedError('Token project mismatch')
}
```

Full file after edit:

```ts
import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { UserAccessTokenService } from '@ports/UserAccessTokenService'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'

@injectable()
export class UserAuthMiddleware {
  constructor(
    @inject(UserAccessTokenService)
    private readonly accessTokens: UserAccessTokenService,

    @inject(UserSessionRepository)
    private readonly sessions: UserSessionRepository,

    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,
  ) {}

  async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    const header = req.header('authorization')

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token')
    }

    const token = header.substring(7)

    const decoded = this.accessTokens.decodeUnverified(token)
    if (!decoded) throw new UnauthorizedError('Invalid token')

    const project = await this.projects.findById(decoded.projectId)
    if (!project) throw new UnauthorizedError('Project not found')

    const payload = this.accessTokens.verify(token, project.jwtSecret)

    if (req.projectAuth && req.projectAuth.projectId !== payload.projectId) {
      throw new UnauthorizedError('Token project mismatch')
    }

    const session = await this.sessions.findById(payload.sessionId)
    if (!session) {
      throw new UnauthorizedError('Session not found')
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED')
    }

    if (session.userId !== payload.userId) {
      throw new UnauthorizedError('Invalid session')
    }

    req.userAuth = payload

    next()
  }
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/presentation/http/middleware/UserAuthMiddleware.ts
git commit -m "security: validate apiKey project matches userJWT project in UserAuthMiddleware"
```

---

### Task 2: Add `authenticateApiKey` to all `/me/*` and logout routes

**Files:**

- Modify: `src/presentation/http/routes/user.ts:25-36`

**Interfaces:**

- Consumes: `authenticateApiKey` bound in constructor (already injected via `ApiKeyAuthMiddleware`)
- Produces: all 9 remaining routes now require `apiKeyAuth` as first middleware

- [x] **Step 1: Add `authenticateApiKey` to logout, logout-all, and all /me/\* routes**

Replace lines 25–36 in `user.ts`:

```ts
router.post('/logout', authenticateApiKey, authenticate, c.logoutCurrent.bind(c))

router.post('/logout-all', authenticateApiKey, authenticate, c.logoutAll.bind(c))

router.get('/me', authenticateApiKey, authenticate, c.getProfile.bind(c))
router.patch('/me/email', authenticateApiKey, authenticate, c.changeEmail.bind(c))
router.patch('/me/password', authenticateApiKey, authenticate, c.changePassword.bind(c))
router.delete('/me', authenticateApiKey, authenticate, c.deleteSelf.bind(c))

router.get('/me/fields', authenticateApiKey, authenticate, c.getFields.bind(c))
router.get('/me/fields/:fieldId', authenticateApiKey, authenticate, c.getField.bind(c))
router.patch('/me/fields/:fieldId', authenticateApiKey, authenticate, c.update.bind(c))
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [x] **Step 3: Manual smoke test**

Start server: `pnpm dev`

Call `/me` with valid user JWT but **no** `Authorization: Bearer <apiKey>` header:

```bash
curl -X GET http://localhost:8080/projects/<projectId>/users/me \
  -H "X-User-Token: Bearer <userJWT>"
```

Expected: `401 Unauthorized` with `Missing API key`.

Call with valid apiKey but JWT from a **different project**:
Expected: `401 Unauthorized` with `Token project mismatch`.

Call with matching apiKey + valid userJWT:
Expected: `200 OK` with profile data.

- [x] **Step 4: Commit**

```bash
git add src/presentation/http/routes/user.ts
git commit -m "feat: require apiKey on all user endpoints"
```
