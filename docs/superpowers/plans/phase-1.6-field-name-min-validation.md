---
title: Phase 1.6 — Project Field Name Has No Minimum Length Validation
date: 2026-08-03
status: done
priority: high — empty field name persists to DB, breaks schema builder and URL routing
---

# Phase 2.18 — Project Field `name` Has No Minimum Length Validation

`AddProjectFieldSchema` and `UpdateProjectFieldSchema` define `name: z.string().max(64)` with no `.min()`. An empty string `""` or a single character `"x"` passes validation, persists to the DB, and causes downstream breakage.

---

## The validators

```ts
// AddProjectFieldValidator.ts
name: z.string().max(64)   // ← no min

// UpdateProjectFieldValidator.ts
name: z.string().max(64)   // ← no min
```

---

## What breaks with `name: ""`

### 1. `SchemaBuilderService.build` produces a broken Zod schema

```ts
// field.name = ""
shape[""] = z.string()
// → z.object({ "": z.string() })
```

`RegisterUser` and `UpdateUserField` call `.parse()` on this schema. Every request passes an empty-keyed object → field silently has no value. Required empty-named fields cause confusing Zod errors.

### 2. `GET /projects/:projectId/users/:userId/fields/:name` breaks

URL path for empty name: `/projects/.../users/.../fields/` — Express matches the route but `:name` param is an empty string. `findByProjectAndName(projectId, "")` returns the stored field, but the endpoint is effectively unreachable through any normal HTTP client that strips trailing slashes.

### 3. `PATCH /projects/:projectId/users/:userId/fields/:name` same routing break

`UpdateUserFieldHandler.execute` calls `projectFields.findByProjectAndName(projectId, "")` — finds the field but the user can never reach this route via a real HTTP client.

### 4. Duplicate field names become possible with single-char names

Two fields named `"x"` and `"y"` are distinct. Two fields named `""` would conflict on the unique constraint `(projectId, name)` in the DB — but an empty-named field occupies the only empty-name slot permanently.

---

## Fix

Add `.min(1)` at the validator level (bare minimum — prevents empty string). Consider `.min(2)` or `.min(3)` to also prevent single-character or cryptic names.

Field names serve as URL path segments and Zod object keys. Convention: snake_case identifiers like `phone_number`, `birth_date`, `age`. A practical minimum is 2 characters.

```ts
// AddProjectFieldValidator.ts
name: z.string().min(2).max(64)

// UpdateProjectFieldValidator.ts
name: z.string().min(2).max(64)
```

No domain changes needed — `ProjectField` stores `name` as a raw string (no `Name` VO), so all enforcement is at the validator level.

---

## Checklist

- [ ] `AddProjectFieldSchema` — add `.min(2)` (or decide on minimum: 1, 2, or 3)
- [ ] `UpdateProjectFieldSchema` — same
- [ ] Decide and document the naming convention for field names (snake_case? alphanumeric+underscore? free text?)
- [ ] Consider adding a regex to the validator to enforce the naming convention (e.g. `/^[a-z][a-z0-9_]*$/`) — prevents field names with spaces or special chars that would break Zod object key usage
