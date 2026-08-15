---
title: Phase 0.52 — Transaction Rollback Test Isolation
date: 2026-08-16
status: planning
priority: medium — replaces truncateAll (DELETE ~10 tables × N tests) with instant rollback; eliminates data leak risk between tests in the same file
---

# Phase 0.52 — Transaction Rollback Test Isolation

Current pattern: `beforeEach → truncateAll` deletes all rows from all tables before every test. With 213 tests this runs ~200 DELETE operations. Each DELETE acquires locks, flushes WAL, and is slow under concurrent load.

Better pattern: wrap each test in a transaction that is rolled back after the test. No deletes — the DB state is reset instantly via rollback.

---

## 0.52.1 — How it works

```
beforeEach:
  BEGIN TRANSACTION

test body:
  INSERT / UPDATE / SELECT (all inside the transaction)

afterEach:
  ROLLBACK  ← all changes disappear instantly, no DELETE needed
```

The DB returns to the pre-test state after every rollback. Zero writes survive to the next test.

---

## 0.52.2 — The problem: Prisma's connection pool

Prisma uses a connection pool. A transaction must live on a single connection. But Prisma handlers, repositories, and services each acquire connections independently — they don't automatically join an ambient transaction.

The current `TransactionContext` / `PrismaUnitOfWork` pattern wraps specific operations, but the test-level ambient transaction needs to span ALL Prisma operations in a test, including those that don't go through `UnitOfWork`.

**Solution: intercept at the `PrismaProvider` level.**

---

## 0.52.3 — Implementation: transactional PrismaProvider

```ts
// src/tests/helpers/transactionalPrisma.ts
import { PrismaClient } from '@generated/prisma/client'

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

let _tx: PrismaTransaction | null = null

export function setActiveTransaction(tx: PrismaTransaction): void {
  _tx = tx
}

export function clearActiveTransaction(): void {
  _tx = null
}

export function getActiveTransaction(): PrismaTransaction | null {
  return _tx
}
```

**Modified `PrismaProvider`** (test mode only):
```ts
// Override $transaction behavior in tests to use the ambient tx
get prismaClient(): PrismaClient | PrismaTransaction {
  if (process.env['NODE_ENV'] === 'test' && getActiveTransaction()) {
    return getActiveTransaction()!
  }
  return this.client
}
```

**Test setup:**
```ts
// src/tests/helpers/db.ts
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { setActiveTransaction, clearActiveTransaction } from './transactionalPrisma'

export function useTransactionIsolation(container: Container): void {
  const prisma = container.get(PrismaProvider)

  beforeEach(async () => {
    // Start a transaction that will be rolled back
    await new Promise<void>((resolve) => {
      prisma.client.$transaction(async (tx) => {
        setActiveTransaction(tx)
        resolve()
        // Hold the transaction open until afterEach signals rollback
        await new Promise((_, reject) => {
          afterEachReject = reject
        })
      }).catch(() => {})  // expected rollback
    })
  })

  afterEach(() => {
    clearActiveTransaction()
    afterEachReject?.(new Error('rollback'))  // triggers ROLLBACK
  })
}
```

**Problem with this approach:** Prisma's `$transaction` callback doesn't support "hold open" — it resolves after the callback completes. Keeping a transaction open across async boundaries requires a raw SQL connection or a different strategy.

---

## 0.52.4 — Cleaner approach: pg client with manual transaction

Use `pg` directly for the test-level transaction, bypassing Prisma's connection pool:

```ts
import { Client } from 'pg'

let pgClient: Client | null = null

export async function beginTestTransaction(): Promise<void> {
  pgClient = new Client({ connectionString: process.env['DATABASE_URL'] })
  await pgClient.connect()
  await pgClient.query('BEGIN')
  // Tell Prisma to use this connection
  // (requires Prisma driver adapter — available with @prisma/adapter-pg)
}

export async function rollbackTestTransaction(): Promise<void> {
  await pgClient?.query('ROLLBACK')
  await pgClient?.end()
  pgClient = null
}
```

Then wire Prisma to use this `pg.Client` via `@prisma/adapter-pg`:
```ts
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg(pgClient)
const prisma = new PrismaClient({ adapter })
```

In tests:
```ts
beforeEach(async () => {
  await beginTestTransaction()
  // Rebuild container with transaction-bound Prisma client
})

afterEach(async () => {
  await rollbackTestTransaction()
})
```

**Caveat:** this requires rebuilding or re-binding the Prisma client per test, which conflicts with the singleton container pattern. Container needs to support rebinding `PrismaProvider` with a fresh client.

---

## 0.52.5 — Simplest viable implementation

Given the complexity above, a pragmatic middle ground:

**Replace `DELETE` with `TRUNCATE ... RESTART IDENTITY CASCADE`:**
```ts
// Faster than DELETE, same result
await prisma.$executeRaw`TRUNCATE TABLE "Client", "Session", "RefreshToken", ... RESTART IDENTITY CASCADE`
```

`TRUNCATE` is:
- Non-logged (no WAL overhead per row)
- Acquires `ACCESS EXCLUSIVE` lock once
- ~10-50x faster than `DELETE` on large tables

This doesn't require any architectural change. For 213 tests, this alone could cut `truncateAll` overhead by 5-10x.

---

## 0.52.6 — Full transaction rollback: recommended path

For true transaction rollback isolation, the recommended architecture is:

1. Use `@prisma/adapter-pg` (already a dependency: `@prisma/adapter-pg` is in `package.json`)
2. In test setup: create a `pg.Client`, `BEGIN` transaction, wrap Prisma with this client
3. In test teardown: `ROLLBACK`, close client
4. Container gets a fresh Prisma client per test (not singleton for tests)

This requires:
- `PrismaProvider` to accept an optional external `pg.Client`
- `getTestContainer()` to rebuild the Prisma binding per test (or use `rebind`)
- `disconnectTestDb` moved to per-file `afterAll`

**Dependencies:** `pg` (already installed), `@prisma/adapter-pg` (already in package.json).

---

## Trade-offs vs truncateAll

| | truncateAll (current) | TRUNCATE (quick fix) | Transaction rollback |
|--|--|--|--|
| Speed | Slow | Fast | Fastest |
| Complexity | Low | Low | High |
| Risk | None | None | Medium |
| Parallel-safe | Yes (with schema isolation) | Yes | Requires per-test connection |

---

## Priority Order

1. **Quick win:** replace `DELETE` with `TRUNCATE` in `truncateAll` — 1 hour, 5-10x faster, zero risk
2. **Full solution:** `@prisma/adapter-pg` + per-test transaction rollback — after Phase 0.51 (schema isolation) is in place
3. **Only attempt full solution** after parallel execution works — the two features together give maximum speedup
