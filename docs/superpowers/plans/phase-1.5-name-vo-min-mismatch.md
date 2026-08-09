---
title: Phase 1.5 — Name VO Minimum Not Mirrored in Zod Validators
date: 2026-08-03
status: done
priority: medium — produces confusing 400 errors, wrong field in error response, poor DX
---

# Phase 2.17 — `Name` VO Minimum Not Mirrored in Zod Validators

`Name.create()` enforces 8–64 characters. Five presentation-layer validators that feed into `Name.create()` allow shorter strings. The mismatch means Zod passes the input, the domain throws a `ValidationError`, and the caller gets a generic 400 instead of a field-level Zod error.

---

## Mismatch table

| Validator | Field | Zod min | `Name.create()` min | Status |
|-----------|-------|---------|---------------------|--------|
| `RegisterClientSchema` | `name` | 8 | 8 | ✓ correct |
| `ChangeClientNameSchema` | `name` | **3** | 8 | ✗ |
| `CreateProjectSchema` | `name` | **none** | 8 | ✗ |
| `RenameProjectSchema` | `name` | **1** | 8 | ✗ |
| `RotateApiKeySchema` | `name` (optional) | **1** | 8 | ✗ |
| `RenameApiKeySchema` | `name` | **1** | 8 | ✗ |

---

## What the caller sees with a short name (e.g. `"App"`, 3 chars)

**Expected:** 400 with Zod-style field-level error — `{ "name": "String must contain at least 8 character(s)" }`

**Actual:** Zod passes → domain throws `ValidationError('Invalid name: must be 8-64 characters long', 'INVALID_NAME_LENGTH')` → error handler returns:
```json
{ "error": { "message": "Invalid name: must be 8-64 characters long" } }
```

The response is a 400 (correct status) with a generic top-level message that does not name the field or match the Zod error shape used everywhere else. Any client-side form validation or SDK error parsing breaks for short names.

---

## Root cause

`Name.create()` is the single source of truth for this constraint, but it lives in the domain layer. The presentation layer validators were written independently without consulting the domain VO. `RegisterClientSchema` was written correctly; the others were not.

---

## Fix

Add `.min(8)` to all five validators:

```ts
// ChangeClientNameSchema
name: z.string().min(8).max(64)

// CreateProjectSchema
name: z.string().min(8).max(64)

// RenameProjectSchema
name: z.string().min(8).max(64)

// RotateApiKeySchema
name: z.string().min(8).max(64).optional()

// RenameApiKeySchema
name: z.string().min(8).max(64)
```

No handler or domain changes needed — the domain already rejects correctly, the validators just need to catch it first.

---

## Checklist

- [ ] `ChangeClientNameSchema` — change `.min(3)` to `.min(8)`
- [ ] `CreateProjectSchema` — add `.min(8)`
- [ ] `RenameProjectSchema` — change `.min(1)` to `.min(8)`
- [ ] `RotateApiKeySchema` — change `.min(1)` to `.min(8)` (keep `.optional()`)
- [ ] `RenameApiKeySchema` — change `.min(1)` to `.min(8)`
- [ ] Consider: is 8 the right minimum for API key and project names? If not, adjust `Name.create()` and all validators together
