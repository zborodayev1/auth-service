---
title: Phase 3.5 — Test Infrastructure
date: 2026-08-03
status: done
priority: medium — zero coverage on an auth service is a regression risk
---

# Phase 3.2 — Test Infrastructure

Zero test files in the entire codebase. Auth service logic (token rotation, session management, field validation) mutates security-critical state — regressions are invisible without tests.

---

## Scope

Two layers only. No E2E. No snapshot tests.

| Layer       | What                                                       | Tool                           |
| ----------- | ---------------------------------------------------------- | ------------------------------ |
| Unit        | Domain aggregates + value objects                          | Vitest                         |
| Integration | Critical command handlers (login, register, token refresh) | Vitest + real Prisma + test DB |

---

## Setup

### 1. Install

```bash
pnpm add -D vitest @vitest/coverage-v8
```

`vitest.config.ts` at root:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/generated/**'] },
  },
  resolve: {
    alias: {
      '@app': '/src/application',
      '@aggregates': '/src/domain/aggregates',
      '@valueObjects': '/src/domain/valueObjects',
      '@shared': '/src/shared',
      '@infra': '/src/infrastructure',
      '@libs': '/src/libs',
      '@config': '/src/config',
      '@ports': '/src/domain/ports',
      '@factories': '/src/application/factories',
      '@services': '/src/application/services',
      '@generated': '/src/generated',
      '@entities': '/src/domain/entities',
    },
  },
})
```

Add to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 2. Test DB

Separate `DATABASE_URL` for tests. Use `.env.test`. Reset between test suites with `prisma migrate reset --force` or a `beforeAll` truncate helper.

---

## Unit Tests — Domain

Test pure aggregate/VO logic only. No DB, no DI, no mocks.

**Target files:**

- `src/domain/aggregates/client/Client.ts` — `reName`, `changeEmail`, `changePassword`
- `src/domain/aggregates/user/User.ts` — `changeEmail`, `changePassword`
- `src/domain/aggregates/project/Project.ts` — `reName`, `reNameApiKey`
- `src/domain/valueObjects/Email.ts` — format validation
- `src/domain/valueObjects/Password.ts` — length/format rules
- `src/domain/valueObjects/Name.ts` — rules

**Example pattern:**

```ts
// src/domain/aggregates/client/Client.test.ts
import { describe, it, expect } from 'vitest'
import { Client } from './Client'

describe('Client.reName', () => {
  it('returns new instance with updated name', () => {
    const client = Client.create(...)
    const renamed = client.reName(newName)
    expect(renamed.name).toBe(newName)
    expect(renamed).not.toBe(client)
  })
})
```

---

## Integration Tests — Handlers

Test the full command handler stack against a real test DB. Inversify container optional — construct handlers manually with real Prisma repos.

**Priority order (highest regression risk first):**

1. `LoginClientHandler` — password verify, session create, refresh token create
2. `RefreshClientAccessTokenHandler` — token rotation, revocation, expiry
3. `RegisterUserHandler` — field validation, value persistence
4. `LoginUserHandler` — same as client login
5. `DeleteProjectHandler` — cascade delete correctness

**Pattern:**

```ts
// src/application/commands/client/LoginClient/LoginClientHandler.test.ts
import { beforeEach, afterAll, describe, it, expect } from 'vitest'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'

const prisma = new PrismaProvider()

beforeEach(async () => {
  await prisma.client.deleteMany() // truncate relevant tables
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('LoginClientHandler', () => {
  it('returns access token + sets refresh token on valid credentials', async () => {
    // seed client, call handler, assert tokens
  })

  it('throws UnauthorizedError on wrong password', async () => {
    // ...
  })
})
```

---

## Out of Scope

- Mocking repositories (integration tests must use real DB — mocked repos caught no bugs historically)
- Controller/HTTP layer tests (use integration test for handlers instead)
- 100% coverage target — cover critical paths, not everything
