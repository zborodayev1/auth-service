# Testing System

## Test Types & Commands

| Pattern | Command | What |
|---------|---------|------|
| `*.test.ts` | `pnpm test` | Unit: aggregates, VOs, pure services |
| `*.integration.test.ts` | `pnpm test:integration` | Command/Query handlers — real DB + DI |
| `*.http.test.ts` | `pnpm test:integration` | HTTP routes via supertest |

---

## How Isolation Works

**Per file — PostgreSQL schema**: `setup.schema.ts` runs before each file, creates `test_<uuid>` schema, applies all Prisma migrations via raw `pg`, sets `process.env.TEST_SCHEMA`. `afterAll` drops schema. `PersistenceContext` reads `TEST_SCHEMA` to set `search_path`.

**Per test — transaction rollback**: `useTransactionIsolation(container)` wraps each `it()` in a `$transaction` that's rejected in `afterEach`. All repositories read from `TransactionContext.client`, so writes auto-rollback. No manual cleanup needed.

`pool: 'vmForks'` — each file runs in its own VM fork, so `_container` singleton is independent per file.

---

## Containers

### Integration tests
```ts
import { getTestContainer } from '@tests/helpers/container'
const container = getTestContainer()
```
Wires: Persistence, Adapters, Client/User/Project contexts. No HTTP.

### HTTP tests
```ts
import { getTestApp, getHttpTestContainer } from '@tests/helpers/httpContainer'
const app = getTestApp()
const container = getHttpTestContainer()
```
Adds HttpContext (Express, routes, middleware). Pass `app` to supertest.

---

## Seeds

All seeds take the container and run inside the active test transaction.

| Helper | Returns | Creates |
|--------|---------|---------|
| `seedProject(container)` | `{ clientId, projectId }` | Client → Project |
| `seedProjectWithField(container)` | `{ clientId, projectId, fieldId }` | + ProjectField (string "biography") |
| `seedUser(container)` | `{ clientId, projectId, userId, accessToken, refreshToken }` | Client → Project → registered User |
| `seedUserWithField(container)` | `{ ...user, fieldId }` | + ProjectField (string "bio") |

`SEED` / `PROJECT_SEED` constants hold the fixed emails/passwords used — import them to reference in assertions.

---

## Integration Test Template (Command or Query Handler)

File: `src/application/commands/<aggregate>/<Name>/<Name>Handler.integration.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { MyHandler } from './MyHandler'
import { MyCommand } from './MyCommand'
import { SomeError } from '@shared/errors/SomeError'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { seedUser } from '@tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(MyHandler)

describe('MyHandler', () => {
  useTransactionIsolation(container)  // always first

  it('happy path', async () => {
    const { userId, projectId } = await seedUser(container)
    const result = await handler.execute(new MyCommand(userId, projectId, ...))
    expect(result.someField).toBeTruthy()
  })

  it('throws SomeError on bad input', async () => {
    const { userId } = await seedUser(container)
    await expect(
      handler.execute(new MyCommand('00000000-0000-0000-0000-000000000000', ...))
    ).rejects.toThrow(SomeError)
  })
})
```

**JWT → sessionId** (when command takes a sessionId):
```ts
import jwt from 'jsonwebtoken'
const getSessionId = (token: string) => (jwt.decode(token) as { sid: string }).sid
```

---

## HTTP Test Template

File: `src/presentation/http/routes/<name>.http.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { getTestApp, getHttpTestContainer } from '@tests/helpers/httpContainer'
import { useTransactionIsolation } from '@tests/helpers/db'

const app = getTestApp()
const container = getHttpTestContainer()

describe('POST /some/route', () => {
  useTransactionIsolation(container)

  it('returns 201 on valid body', async () => {
    const res = await request(app).post('/some/route').send({ ... })
    const body = res.body as { field?: string }
    expect(res.status).toBe(201)
    expect(typeof body.field).toBe('string')
  })
})
```

**Seed in HTTP tests** — call handlers directly on `container`:
```ts
const { clientId } = await container.get(RegisterClientHandler).execute(new RegisterClientCommand(...))
```

**Cookies**:
```ts
const cookies = (res.headers['set-cookie'] ?? []) as string[]
// check set:
expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true)
// pass forward:
.set('Cookie', cookies)
// check cleared on logout:
expect(cookies.some((c) => c.includes('refresh_token=;'))).toBe(true)
```

---

## Unit Test Template

No container, no seeds, no async setup:

```ts
import { describe, expect, it } from 'vitest'
import { Client } from './Client'

describe('Client', () => {
  it('renames and returns new instance (immutability)', () => {
    const client = Client.create(...)
    const renamed = client.reName(Name.create('New'))
    expect(renamed.name.value).toBe('New')
    expect(client).not.toBe(renamed)
  })
})
```

---

## Error → HTTP Status

| Error class | Status |
|-------------|--------|
| `ValidationError` | 400 |
| `UnauthorizedError` | 401 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |

---

## Known Constraint

`UserAuthMiddleware` and `ApiKeyAuthMiddleware` both read `Authorization` header. Routes requiring both tokens simultaneously (`GET /me`, `PATCH /me/*`, `DELETE /me`, `GET /me/sessions`, etc.) **cannot be tested via HTTP** — test at handler level instead.
