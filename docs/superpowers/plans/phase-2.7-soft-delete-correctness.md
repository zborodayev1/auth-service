---
title: Phase 2.7 — Soft Delete Correctness Fixes
date: 2026-08-03
status: done
priority: high — bugs introduced in phase-2.5, some cause silent data corruption
---

# Phase 2.5.1 — Soft Delete Correctness Fixes

Phase 2.5 introduced soft delete for `ProjectField` and `UserFieldValue`. Three concrete bugs shipped with it.

---

## Bug 1 — `findUnique` with soft-delete filter on composite key (silent wrong query)

**Files:** `PrismaProjectFieldRepository.ts:57`, `PrismaUserFieldValueRepository.ts:37`

Prisma's `findUnique` composite key selector only accepts fields that are part of the `@@unique` constraint. Passing extra fields inside the composite selector is either a TypeScript error (if types are strict) or silently ignored at runtime.

```ts
// WRONG — deletedAt is not in @@unique([projectId, name])
const raw = await this.prismaClient.projectField.findUnique({
  where: { projectId_name: { projectId, name, deletedAt: null } },
})

// WRONG — deletedAt is not in @@unique([userId, fieldId])
const raw = await this.prismaClient.userFieldValue.findUnique({
  where: { userId_fieldId: { userId, fieldId, deletedAt: null } },
})
```

**Fix:** switch to `findFirst` and move `deletedAt: null` outside the composite selector.

```ts
// ProjectFieldRepository
const raw = await this.prismaClient.projectField.findFirst({
  where: { projectId, name, deletedAt: null },
})

// UserFieldValueRepository
const raw = await this.prismaClient.userFieldValue.findFirst({
  where: { userId, fieldId, deletedAt: null },
})
```

`findFirst` does not guarantee uniqueness at the query level — but the DB constraint still enforces uniqueness for active (non-deleted) rows once Bug 2 is fixed.

---

## Bug 2 — Unique constraint blocks re-creating a soft-deleted field

**Affected models:** `ProjectField @@unique([projectId, name])`, `UserFieldValue @@unique([userId, fieldId])`

Soft-deleted rows (`deletedAt IS NOT NULL`) still occupy the unique index. Result: after deleting field "age", creating a new field "age" passes the application-level check (`findByProjectAndName` returns null) but fails at the DB level with a unique constraint violation.

**Fix:** PostgreSQL partial unique indexes — index only active rows.

Drop the current Prisma-generated unique constraints and replace with raw SQL migrations:

```sql
-- ProjectField: drop model-level unique, add partial unique
ALTER TABLE "ProjectField" DROP CONSTRAINT IF EXISTS "ProjectField_projectId_name_key";
CREATE UNIQUE INDEX "ProjectField_projectId_name_active_idx"
  ON "ProjectField" ("projectId", "name")
  WHERE "deletedAt" IS NULL;

-- UserFieldValue: drop model-level unique, add partial unique
ALTER TABLE "UserFieldValue" DROP CONSTRAINT IF EXISTS "UserFieldValue_userId_fieldId_key";
CREATE UNIQUE INDEX "UserFieldValue_userId_fieldId_active_idx"
  ON "UserFieldValue" ("userId", "fieldId")
  WHERE "deletedAt" IS NULL;
```

**Schema changes required:**

Remove `@@unique` from both models — Prisma cannot express partial indexes declaratively. Use `@@index` as a hint for tooling, add raw SQL in migration.

```prisma
model ProjectField {
  // remove: @@unique([projectId, name])
  // keep everything else
}

model UserFieldValue {
  // remove: @@unique([userId, fieldId])
  // keep everything else
}
```

The partial index is created via a custom migration file. `prisma migrate dev` will generate the base migration; edit it to include the `CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL` statement and remove the plain `ADD CONSTRAINT` for those two.

**Impact on `findByProjectAndName` / `findByUserAndField`:** after Bug 1 fix, these already use `findFirst` — no further changes needed. The partial index makes the DB enforce the right invariant.

---

## Bug 3 — `saveMany` does N sequential upserts

**File:** `PrismaUserFieldValueRepository.ts:saveMany`

```ts
async saveMany(values: UserFieldValue[]): Promise<void> {
  for (const v of values) {
    await this.save(v) // N round trips
  }
}
```

Called during `RegisterUser` — one DB round trip per field value. For a project with 10 fields that's 10 sequential queries inside a transaction.

**Fix:** use `Promise.all` for parallel upserts within the same transaction context, or use Prisma `$transaction` with an array of operations.

```ts
async saveMany(values: UserFieldValue[]): Promise<void> {
  await Promise.all(values.map((v) => this.save(v)))
}
```

Note: `prisma.$transaction([...operations])` with an array of `upsert` calls is an alternative but requires building the operation array differently. `Promise.all` within an existing `UnitOfWork` transaction is simpler and sufficient — Prisma's interactive transactions handle concurrent operations correctly.

---

## Execution Order

1. Bug 2 first — create migration with partial indexes, update schema
2. Bug 1 — `findFirst` fixes in both repositories
3. Bug 3 — `saveMany` parallelization

Bugs 1 and 2 are coupled: the partial index makes `findFirst` semantically correct. Do them together.
