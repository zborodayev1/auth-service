---
title: Phase 2.3 — PrismaClientKnownRequestError P2002 → 500
date: 2026-08-03
status: done
priority: medium — only hits under concurrent requests, but returns 500 instead of 409
---

# Phase 2.10 — Unhandled Prisma Unique Constraint Violations

All uniqueness checks are app-level (read → check → write). Not atomic. Two concurrent requests can both pass the check and both attempt the insert — the second gets a DB-level unique constraint violation (`PrismaClientKnownRequestError`, code `P2002`).

`PrismaClientKnownRequestError` is not `AppError` → error handler falls through to 500 "Internal server error".

The DB constraint is correct and the data stays consistent — only the response is wrong.

---

## Affected operations

| Command | Unique constraint | Check before insert |
|---------|-------------------|---------------------|
| `RegisterClient` | `Client.email` | `findByEmail` |
| `RegisterUser` | `User.(projectId, email)` | `findByProjectAndEmail` |
| `CreateProject` | `Project.(ownerId, name)` | none — silent duplicate possible |
| `AddProjectField` | `ProjectField.(projectId, name)` | `findByProjectAndName` |

`CreateProject` has no app-level uniqueness check at all — `@@unique([ownerId, name])` means a client creating two projects with the same name gets a P2002 immediately (not race-dependent).

---

## Checklist

- [ ] Decide where to handle P2002: in `errorHandler.ts` globally (catch P2002, return 409) or per-repository (wrap upsert/create, translate to `ConflictError`)
- [ ] Handle `PrismaClientKnownRequestError` with `code === 'P2002'` — must not expose DB field names in response
- [ ] `RegisterClient` — P2002 on email → 409 `EMAIL_TAKEN`
- [ ] `RegisterUser` — P2002 on `(projectId, email)` → 409 `EMAIL_TAKEN`
- [ ] `CreateProject` — P2002 on `(ownerId, name)` → 409 `PROJECT_NAME_TAKEN` (currently no app-level check exists either)
- [ ] `AddProjectField` — P2002 on `(projectId, name)` → 409 `FIELD_ALREADY_EXISTS`
- [ ] Verify the global handler (if chosen) does not accidentally swallow P2002 from unrelated models with a generic message
