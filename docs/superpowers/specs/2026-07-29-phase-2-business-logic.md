---
title: Phase 2 — Missing Business Logic
date: 2026-07-29
status: planned
---

# Phase 2 — Missing Business Logic

Full business logic surface. All endpoints, commands, and queries needed for a complete system.

---

## User Read Endpoints (User JWT)

### GET /projects/:projectId/users/me/fields
Returns all field values for the authenticated user.

**Query:** `GetUserFields`
- Input: `userId`, `projectId`
- Load all `ProjectField[]` for project
- Load all `UserFieldValue[]` for user
- Join: return `{ name, type, value }[]`

**Route:** `UserRouter` — `GET /me/fields` (auth required)

---

### GET /projects/:projectId/users/me/fields/:name
Returns a single field value for the authenticated user.

**Query:** `GetUserField`
- Input: `userId`, `projectId`, `fieldName`
- `ProjectFieldRepository.findByProjectAndName(projectId, fieldName)` → 404 if null
- `UserFieldValueRepository.findByUserAndField(userId, fieldId)` → 404 if null
- Return `{ name, type, value }`

**Route:** `UserRouter` — `GET /me/fields/:name` (auth required)

---

## Admin Endpoints (Client JWT)

### GET /projects/:projectId/users/:userId/fields
Client reads all field values for any user in their project.

**Query:** `GetAdminUserFields`
- Input: `clientId`, `projectId`, `userId`
- Verify project ownership: `ProjectRepository.findById(projectId)` → check `ownerId === clientId` → 403 if not
- Load `ProjectField[]` + `UserFieldValue[]` for user
- Return `{ name, type, value }[]`

**Route:** `ProjectRouter` — `GET /:projectId/users/:userId/fields` (Client auth required)

---

### PATCH /projects/:projectId/users/:userId/fields/:name
Client updates a field value for any user in their project.

**Command:** `AdminUpdateUserField`
- Input: `clientId`, `projectId`, `userId`, `fieldName`, `value: string`
- Verify project ownership → 403 if not owner
- Same validation + save logic as `UpdateUserFieldHandler`

**Route:** `ProjectRouter` — `PATCH /:projectId/users/:userId/fields/:name` (Client auth required)

---

## User Management (potential additions)

### DELETE /projects/:projectId/users/:userId (admin)
Client deletes a user from their project.

**Command:** `DeleteUser`
- Cascade: delete `UserFieldValue[]`, `UserSession[]`, `UserRefreshToken[]`, then `User`
- Must be atomic (transaction)

---

### GET /projects/:projectId/users (admin)
Client lists all users in their project. Pagination needed.

**Query:** `GetProjectUsers`
- `UserRepository.findByProjectId(projectId)`
- Return `{ id, email, createdAt }[]` (no field values — separate endpoint)

---

## Notes

- Admin endpoints must verify `project.ownerId === req.auth.clientId` — never trust `:projectId` alone
- `GetUserFields` and `GetAdminUserFields` need join logic (fields + values) — consider a dedicated read model or repo method
- User management endpoints (delete, list) are lower priority than read/update field endpoints
