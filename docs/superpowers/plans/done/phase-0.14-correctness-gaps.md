---
title: Phase 2.2 — Correctness Gaps
date: 2026-08-03
status: done
priority: medium — correctness bugs, no architectural changes needed
---

# Phase 2.7 — Correctness Gaps

Four independent problems found during code review. None covered by existing specs.

---

## Checklist

### 2.7.1 — `ZodError` → 500 on every endpoint

- [ ] `errorHandler.ts` does not handle `ZodError`
- [ ] Any request with invalid body/params falls through to the 500 branch
- [ ] All 30+ controller methods use `.parse()` — throws `ZodError` on invalid input
- [ ] Expected: 400 with field-level validation details
- [ ] Actual: 500 "Internal server error"

---

### 2.7.2 — Field name as mutable identifier in update URLs

- [ ] `PATCH /user/fields/:name` — uses display name as URL key
- [ ] `PATCH /projects/:projectId/users/:userId/fields/:name` — same
- [ ] Field name can be changed via `UpdateProjectField`
- [ ] After rename: old URL → `FIELD_NOT_FOUND`, data exists but is inaccessible
- [ ] Fix must choose: stable URL key (fieldId) or forbid rename when values exist

#### 2.7.2a — `GetUserFields` does not expose `fieldId`

- [ ] `UserFieldService.getFieldsWithValues` returns `{ name, type, value, required, defaultValue }` — no `id`
- [ ] If URL changes to `/:fieldId`, user SDK has no way to get fieldId from current responses
- [ ] `fieldId` must be added to `GetUserFields`, `GetUserField`, and related query results before URL migration

---

### 2.7.3 — `force` query param not Zod-validated

- [ ] `deleteField` reads `req.query['force'] === 'true'` directly — no Zod schema
- [ ] Only place in codebase where a query param bypasses the validator pattern
- [ ] Inconsistent with every other param/body in the codebase

---

### 2.7.4 — `SchemaBuilderService` per-instance in-memory cache

- [ ] Cache lives in process memory — not shared between instances
- [ ] On multi-instance deploy: field add/update/delete invalidates cache only on the mutating instance
- [ ] Other instances serve stale schema → `RegisterUser` may accept/reject fields incorrectly
- [ ] Not a problem for single-instance, becomes a correctness bug on horizontal scale

---

### 2.7.5 — `DeleteProject` does not invalidate schema cache

- [ ] `DeleteProjectHandler` does not call `schemaBuilder.invalidate(projectId)`
- [ ] All field mutation handlers (`AddProjectField`, `UpdateProjectField`, `DeleteProjectField`) do call invalidate — `DeleteProject` is the only path that doesn't
- [ ] After project deletion, cache entry lingers in memory indefinitely (memory leak for high project churn)
- [ ] Harmless for correctness (deleted project's users can't register), but leaks memory
