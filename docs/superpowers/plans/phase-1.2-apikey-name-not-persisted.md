---
title: Phase 1.2 — ApiKey Name Not Persisted on Update
date: 2026-08-03
status: backlog
priority: high — RenameApiKey is silently broken
---

# Phase 2.9 — ApiKey Name Not Persisted on Update

`PrismaProjectRepository.save` upserts the ApiKey with an `update` block that omits `name`. Every write goes through this path — rename and rotate both call `projects.save()`.

**File:** `src/infrastructure/persistence/prisma/repositories/PrismaProjectRepository.ts:55`

```ts
update: { revoked: project.apiKey.revoked, hash: project.apiKey.hash }
// name is missing
```

---

## Affected commands

### `RenameApiKey`
- Handler renames key in memory → calls `projects.save(updated)` → update omits `name`
- Returns `{ id, name }` from in-memory object — looks like success
- Next `GET /projects/:id/key` or `GET /clients/projects` loads from DB → old name

### `RotateApiKey` (partial)
- `command.name` can override the key name
- New `ApiKey` is created with the new name
- Same `save()` path — name not written to DB
- Also: new `id` (from `idGenerator.generate()`) is not written to `update` block either — DB keeps the old API key id after rotation

---

## Checklist

- [ ] Add `name` to the `update` block in `PrismaProjectRepository.save` apiKey upsert
- [ ] Add `id` to the `update` block (or reconsider whether apiKey id should change on rotate — currently the DB row keeps the old id while the domain object has a new one)
- [ ] Verify `RenameApiKey` response matches what's actually in DB after fix
- [ ] Verify `RotateApiKey` with a new name persists correctly after fix
