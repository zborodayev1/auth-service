---
title: Phase 2.1 — Standardize Handler Return Types
date: 2026-08-01
status: done
---

# Phase 2.01 — Standardize Handler Return Types

## Rule

- Mutation changed something → return what changed
- Mutation with nothing meaningful to return → `{ success: true }`
- No `{ message: string }` anywhere

---

## Changes Required

### `{ message }` → `{ success: true }`

| Handler | Current | Target |
|---------|---------|--------|
| `ChangeClientPasswordHandler` | `{ message }` | `{ success: true }` |
| `ChangeUserPasswordHandler` | `{ message }` | `{ success: true }` |
| `LogoutCurrentClientSessionHandler` | `{ message }` | `{ success: true }` |
| `LogoutAllClientSessionsHandler` | `{ message }` | `{ success: true }` |
| `LogoutUserSessionHandler` | `{ message }` | `{ success: true }` |
| `LogoutAllUserSessionsHandler` | `{ message }` | `{ success: true }` |
| `DeleteProjectFieldHandler` | `{ message }` | `{ success: true }` |

Future delete handlers (`DeleteUserSelf`, `AdminDeleteUser`, `DeleteProject`) → `{ success: true }` from the start.

### `{ message }` → return what changed

| Handler | Current | Target |
|---------|---------|--------|
| `ChangeClientEmailHandler` | `{ message }` | `{ email: string }` |
| `ChangeUserEmailHandler` | `{ message }` | `{ email: string }` |

### Already correct (no change)

| Handler | Returns |
|---------|---------|
| `UpdateUserFieldHandler` | `{ fieldId, value }` ✓ |
| `AddProjectFieldHandler` | `{ fieldId }` ✓ |
| `UpdateProjectFieldHandler` | `{ fieldId }` ✓ |
| `RenameProjectHandler` | `{ projectId, name }` ✓ |
| `RenameApiKeyHandler` | `{ id, name }` ✓ |
| `RotateApiKeyHandler` | `{ rawKey }` ✓ |
| `RegisterClientHandler` | tokens + id ✓ |
| `LoginClientHandler` | tokens + id ✓ |
| `RegisterUserHandler` | tokens + id ✓ |
| `LoginUserHandler` | tokens + id ✓ |

### Incomplete stub (fix separately)

`RenameClientHandler` — interface `{ name }` correct, but handler body missing rename logic. Complete as part of Phase 2 wiring.

---

## Scope

Only handler files — change `interface` body + `return` statement.
Controllers pass result through unchanged (`res.json(result)`) — no controller changes needed.
