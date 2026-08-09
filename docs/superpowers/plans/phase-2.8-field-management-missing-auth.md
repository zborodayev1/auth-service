---
title: Phase 2.8 — Project Field Management Missing Ownership Authorization
date: 2026-08-03
status: done
priority: high — any authenticated client can mutate or read fields on any project
---

# Phase 2.15 — Project Field Management Missing Ownership Authorization

All four field management operations — Add, Update, Delete, and List — are missing ownership checks. The routes are authenticated (require a valid client token via `ClientAuthMiddleware`), but not authorized (no check that the caller owns the project). Any client with a valid access token can mutate or read the schema of any project in the system by guessing or enumerating `projectId`.

---

## Affected operations

| Handler                     | Command/Query               | Has `clientId`? | Calls `ProjectAccessService`? |
| --------------------------- | --------------------------- | --------------- | ----------------------------- |
| `AddProjectFieldHandler`    | `AddProjectFieldCommand`    | ✗               | ✗                             |
| `UpdateProjectFieldHandler` | `UpdateProjectFieldCommand` | ✗               | ✗                             |
| `DeleteProjectFieldHandler` | `DeleteProjectFieldCommand` | ✗               | ✗                             |
| `GetProjectFieldsHandler`   | `GetProjectFieldsQuery`     | ✗               | ✗                             |

For contrast, all other project operations correctly call `accessService.verifyByProjectId(clientId, projectId)`:
`GetProjectHandler`, `GetProjectApiKeyHandler`, `RenameProjectHandler`, `DeleteProjectHandler`, `RotateApiKeyHandler`, `RenameApiKeyHandler`, `GetProjectUsersHandler`, `DeleteProjectUserHandler`.

---

## What an attacker can do

With a valid client token and knowledge of a `projectId` (obtainable from any project the attacker legitimately owns):

- `GET /projects/:projectId/fields` — read the entire field schema (names, types, validation rules)
- `POST /projects/:projectId/fields` — inject arbitrary fields into the project schema
- `PATCH /projects/:projectId/fields/:fieldId` — rename, change validation, toggle `required`
- `DELETE /projects/:projectId/fields/:fieldId?force=true` — destroy all user data for any field

---

## Why it happened

The command classes don't carry `clientId`:

```ts
// AddProjectFieldCommand.ts — no clientId field
export class AddProjectFieldCommand {
  constructor(
    public readonly projectId: string,
    public readonly name: string,
    // ... no clientId
  ) {}
}
```

`ProjectController.addField` passes `req.auth.clientId` nowhere:

```ts
new AddProjectFieldCommand(
  projectId,
  body.name,
  body.type,
  body.required,
  body.defaultValue ?? null,
  body.enumValues,
)
// ← req.auth.clientId not passed
```

`UpdateProjectFieldHandler` and `DeleteProjectFieldHandler` do check `field.projectId === command.projectId` — but that is a field↔project consistency check, not an authorization check. It prevents cross-project confusion, not unauthorized access.

---

## Fix

### 1. Add `clientId` to all four commands/queries

```ts
// AddProjectFieldCommand
export class AddProjectFieldCommand {
  constructor(
    public readonly clientId: string,   // ← add
    public readonly projectId: string,
    ...
  ) {}
}
```

Same for `UpdateProjectFieldCommand`, `DeleteProjectFieldCommand`, `GetProjectFieldsQuery`.

### 2. Inject `ProjectAccessService` into handlers and call `verifyByProjectId`

```ts
// AddProjectFieldHandler.execute
async execute(command: AddProjectFieldCommand) {
  await this.accessService.verifyByProjectId(command.clientId, command.projectId)
  // ... rest unchanged
}
```

Same pattern for `UpdateProjectFieldHandler`, `DeleteProjectFieldHandler`, `GetProjectFieldsHandler`.

### 3. Pass `req.auth.clientId` in controller

```ts
// ProjectController.addField
new AddProjectFieldCommand(
  req.auth.clientId,    // ← add
  projectId,
  body.name,
  ...
)
```

Same for `updateField`, `deleteField`, `getFields`.

---

## Checklist

- [ ] `AddProjectFieldCommand` — add `clientId: string` as first constructor param
- [ ] `AddProjectFieldHandler` — inject `ProjectAccessService`, call `verifyByProjectId` before conflict check
- [ ] `ProjectController.addField` — pass `req.auth.clientId`

- [ ] `UpdateProjectFieldCommand` — add `clientId: string`
- [ ] `UpdateProjectFieldHandler` — inject `ProjectAccessService`, call `verifyByProjectId` before field lookup
- [ ] `ProjectController.updateField` — pass `req.auth.clientId`

- [ ] `DeleteProjectFieldCommand` — add `clientId: string`
- [ ] `DeleteProjectFieldHandler` — inject `ProjectAccessService`, call `verifyByProjectId` before field lookup
- [ ] `ProjectController.deleteField` — pass `req.auth.clientId`

- [ ] `GetProjectFieldsQuery` — add `clientId: string`
- [ ] `GetProjectFieldsHandler` — inject `ProjectAccessService`, call `verifyByProjectId`
- [ ] `ProjectController.getFields` — pass `req.auth.clientId`
