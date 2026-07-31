---
title: Phase 2 — Missing Business Logic
date: 2026-07-29
updated: 2026-07-31
status: planned
---

# Phase 2 — Missing Business Logic

Complete endpoint surface derived from full codebase audit (routes, controllers, handlers, repos, schema).

**Current mount points:**
- `/clients` → ClientRouter
- `/projects/:projectId/users` → UserRouter (mergeParams)
- `/projects` → ProjectRouter (mergeParams)

**Legend:** ✓ = exists and wired | NEW = missing

---

## 1. User Self-Service (User JWT)

UserRouter `/projects/:projectId/users` — all require `UserAuthMiddleware` except register/login/refresh.

| Status | Method | Path | Handler/Query |
|--------|--------|------|---------------|
| ✓ | POST | /register | `RegisterUserHandler` |
| ✓ | POST | /login | `LoginUserHandler` |
| ✓ | POST | /refresh | `RefreshUserAccessTokenHandler` |
| ✓ | POST | /logout | `LogoutUserSessionHandler` |
| ✓ | POST | /logout-all | `LogoutAllUserSessionsHandler` |
| ✓ | PATCH | /me/fields/:name | `UpdateUserFieldHandler` |
| **NEW** | GET | /me | `GetUserProfile` |
| **NEW** | GET | /me/fields | `GetUserFields` |
| **NEW** | GET | /me/fields/:name | `GetUserField` |
| **NEW** | PATCH | /me/email | `ChangeUserEmail` |
| **NEW** | PATCH | /me/password | `ChangeUserPassword` |
| **NEW** | DELETE | /me | `DeleteUserSelf` |

### GET /me → `GetUserProfile`
- Input: `userId` (from userAuth)
- `UserRepository.findById(userId)` → 404 if null
- Return `{ userId, email, projectId, createdAt }`

### GET /me/fields → `GetUserFields`
- Input: `userId`, `projectId` (from userAuth)
- `ProjectFieldRepository.findByProjectId(projectId)` → `ProjectField[]`
- `UserFieldValueRepository.findByUserId(userId)` → `UserFieldValue[]`
- Join by `fieldId`: for each field, find matching value (null if not set)
- Return `{ name, type, value: string | null, required, defaultValue }[]`

### GET /me/fields/:name → `GetUserField`
- Input: `userId`, `projectId`, `fieldName` (param)
- `ProjectFieldRepository.findByProjectAndName(projectId, fieldName)` → 404 if null
- `UserFieldValueRepository.findByUserAndField(userId, field.id)` → 404 if null
- Return `{ name, type, value }`

### PATCH /me/email → `ChangeUserEmail`
- Input: `userId`, `projectId`, `newEmail`, `password`
- `UserRepository.findById(userId)` → 404
- Verify password with `PasswordHasher`
- `UserRepository.findByProjectAndEmail(projectId, newEmail)` → 409 if exists
- Create updated User, `UserRepository.save(user)`
- Return `{ userId, newEmail }`

### PATCH /me/password → `ChangeUserPassword`
- Input: `userId`, `currentPassword`, `newPassword`
- `UserRepository.findById(userId)` → 404
- Verify current password → 401 if wrong
- Hash new password, save updated User
- Return `{ success: true }`

### DELETE /me → `DeleteUserSelf`
- Input: `userId`, `password` (body — require confirmation)
- `UserRepository.findById(userId)` → 404
- Verify password → 401
- **Transaction (UoW):**
  1. `UserRefreshTokenRepository.deleteByUserId(userId)`
  2. `UserSessionRepository.deleteByUserId(userId)`
  3. `UserFieldValueRepository.deleteByUserId(userId)`
  4. `UserRepository.delete(userId)`
- Return 204

---

## 2. Admin — User Management (Client JWT)

ProjectRouter `/projects` — all require `ClientAuthMiddleware`. All must verify `project.ownerId === clientId` → 403.

| Status | Method | Path | Handler/Query |
|--------|--------|------|---------------|
| **NEW** | GET | /:projectId/users | `GetProjectUsers` |
| **NEW** | GET | /:projectId/users/:userId | `GetAdminUser` |
| **NEW** | GET | /:projectId/users/:userId/fields | `GetAdminUserFields` |
| **NEW** | PATCH | /:projectId/users/:userId/fields/:name | `AdminUpdateUserField` |
| **NEW** | DELETE | /:projectId/users/:userId | `AdminDeleteUser` |

> **Route note:** UserRouter is mounted before ProjectRouter. `GET /projects/:projectId/users` hits UserRouter first (no matching `GET /` handler there), falls through to ProjectRouter. Same for `/:userId` sub-paths.

### GET /:projectId/users → `GetProjectUsers`
- Input: `clientId`, `projectId`, `?limit=50&offset=0`
- Verify ownership → 403
- `UserRepository.findByProjectId(projectId, { limit, offset })`
- `UserRepository.countByProjectId(projectId)` (for pagination meta)
- Return `{ users: { id, email, createdAt }[], total, limit, offset }`
- **Repo gap:** `UserRepository` needs `findByProjectId` + `countByProjectId`

### GET /:projectId/users/:userId → `GetAdminUser`
- Input: `clientId`, `projectId`, `userId`
- Verify ownership → 403
- `UserRepository.findById(userId)` → 404; verify `user.projectId === projectId` → 404
- `ProjectFieldRepository.findByProjectId(projectId)`
- `UserFieldValueRepository.findByUserId(userId)`
- Join fields + values
- Return `{ id, email, createdAt, fields: { name, type, value }[] }`

### GET /:projectId/users/:userId/fields → `GetAdminUserFields`
- Same join logic as `GetUserFields` but for any userId
- Verify ownership → 403
- Return `{ name, type, value: string | null, required, defaultValue }[]`

### PATCH /:projectId/users/:userId/fields/:name → `AdminUpdateUserField`
- Verify ownership → 403
- Same validation + save logic as `UpdateUserFieldHandler`
- Input: `clientId`, `projectId`, `userId`, `fieldName`, `value: string`
- Return `{ fieldId, value }`

### DELETE /:projectId/users/:userId → `AdminDeleteUser`
- Verify ownership → 403
- `UserRepository.findById(userId)` → 404; verify `user.projectId === projectId`
- **Transaction (UoW):**
  1. `UserRefreshTokenRepository.deleteByUserId(userId)`
  2. `UserSessionRepository.deleteByUserId(userId)`
  3. `UserFieldValueRepository.deleteByUserId(userId)`
  4. `UserRepository.delete(userId)`
- Return 204

---

## 3. Admin — Project Management (Client JWT)

ProjectRouter `/projects` — all require `ClientAuthMiddleware`.

| Status | Method | Path | Handler/Query |
|--------|--------|------|---------------|
| ✓ | POST | / | `CreateProjectHandler` |
| **NEW** | GET | /:projectId | `GetProject` |
| **NEW** | PATCH | /:projectId | `UpdateProject` |
| **NEW** | DELETE | /:projectId | `DeleteProject` |

### GET /:projectId → `GetProject`
- Verify ownership → 403
- Return `{ id, name, createdAt, fieldCount: number, apiKey: { id, name, revoked, createdAt } }`
- `ProjectFieldRepository.findByProjectId(projectId)` for count

### PATCH /:projectId → `UpdateProject`
- Input: `clientId`, `projectId`, `name`
- Verify ownership → 403
- Check unique `(ownerId, name)` → 409
- `project.reName(newName)`, save
- Return `{ projectId, name }`

### DELETE /:projectId → `DeleteProject`
- Verify ownership → 403
- **Transaction (UoW):** cascade order matters (FK constraints):
  1. `UserRefreshTokenRepository.deleteByProjectId(projectId)`
  2. `UserSessionRepository.deleteByProjectId(projectId)`
  3. `UserFieldValueRepository.deleteByProjectId(projectId)`
  4. `UserRepository.deleteByProjectId(projectId)`
  5. `ProjectFieldRepository.deleteByProjectId(projectId)`
  6. `ProjectRepository.delete(projectId)` (cascades ApiKey via DB or explicit delete)
- Return 204
- **Repo gaps:** all repos need `deleteByProjectId`

---

## 4. ApiKey Management (Client JWT)

ProjectRouter `/projects` — all require `ClientAuthMiddleware`. `ApiKey` is 1:1 with `Project` — one key per project.

| Status | Method | Path | Handler/Query |
|--------|--------|------|---------------|
| **NEW** | GET | /:projectId/key | `GetProjectApiKey` |
| **NEW** | POST | /:projectId/key/rotate | `RotateApiKey` (= `CreateNewApiKey`) |
| **NEW** | PATCH | /:projectId/key | `RenameApiKey` |

> `CreateNewApiKeyCommand` + empty `CreateNewApiKeyHandler` already exist — implement `RotateApiKey` there.

### GET /:projectId/key → `GetProjectApiKey`
- Verify ownership → 403
- Return `{ id, name, revoked, createdAt }` — raw key NOT returned (stored hashed)

### POST /:projectId/key/rotate → `RotateApiKey` (fill `CreateNewApiKeyHandler`)
- Verify ownership → 403
- `ApiKeyService.create(name)` → new `ApiKey` + `rawKey`
- `project.reNameApiKey` or replace apiKey on project, `ProjectRepository.save(project)`
- Return `{ rawKey }` — show once, cannot be retrieved again
- Input: optional `name` (body), defaults to existing name

### PATCH /:projectId/key → `RenameApiKey`
- Verify ownership → 403
- Input: `name`
- `project.reNameApiKey(newName)`, save
- Return `{ id, name }`

---

## 5. Client Self-Service (Client JWT)

ClientRouter `/clients`.

| Status | Method | Path | Handler/Query |
|--------|--------|------|---------------|
| **NEW** | GET | /me | `GetClientProfile` |
| **NEW** | PATCH | /name | `ChangeClientName` |

### GET /me → `GetClientProfile`
- `ClientRepository.findById(clientId)` → 404
- Return `{ clientId, name, email, createdAt }`
- **Domain gap:** `Client.name` — check if exposed; `Client` aggregate has `_name` field?

### PATCH /name → `ChangeClientName`
- Input: `clientId`, `newName`
- `ClientRepository.findById(clientId)` → 404
- Update name, save
- Return `{ clientId, name }`
- **Domain gap:** `Client` needs `reName(name: Name)` method if not present

---

## 6. Repository Gaps (new methods required)

All new methods must accept optional `tx?: TransactionContext` for UoW compatibility (follow existing pattern in the codebase).

### `UserRepository`
```ts
findByProjectId(projectId: string, opts?: { limit: number; offset: number }): Promise<User[]>
countByProjectId(projectId: string): Promise<number>
delete(id: string): Promise<void>
deleteByProjectId(projectId: string): Promise<void>
```

### `UserFieldValueRepository`
```ts
deleteByUserId(userId: string): Promise<void>
deleteByProjectId(projectId: string): Promise<void>
```

### `UserSessionRepository`
```ts
deleteByUserId(userId: string): Promise<void>
deleteByProjectId(projectId: string): Promise<void>
```

### `UserRefreshTokenRepository`
```ts
deleteByUserId(userId: string): Promise<void>      // joins via UserSession
deleteByProjectId(projectId: string): Promise<void> // joins via UserSession
```

### `ProjectFieldRepository`
```ts
deleteByProjectId(projectId: string): Promise<void>
```

### `ProjectRepository`
```ts
delete(id: string): Promise<void>
```

---

## 7. Domain Gaps

- `Client` aggregate: check if `name` is exposed; may need `reName(name: Name)` method
- `User` aggregate: no mutable state currently; `ChangeUserEmail` / `ChangeUserPassword` need update methods
  - Add `changeEmail(email: Email): User`
  - Add `changePassword(password: Password): User`

---

## 8. Priority Order

1. **User self GET** — `GetUserProfile`, `GetUserFields`, `GetUserField` (read-only, safe to build first)
2. **Client profile** — `GetClientProfile` (trivial)
3. **Project GET** — `GetProject` (needed for dashboard)
4. **Admin user reads** — `GetProjectUsers`, `GetAdminUser`, `GetAdminUserFields`
5. **ApiKey management** — `GetProjectApiKey`, `RotateApiKey`, `RenameApiKey`
6. **User mutations** — `ChangeUserEmail`, `ChangeUserPassword`, `UpdateProject`
7. **Deletes** — `DeleteUserSelf`, `AdminDeleteUser`, `DeleteProject` (last — most cascade complexity)
