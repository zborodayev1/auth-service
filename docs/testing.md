# Testing System

## Test Types & Commands

| Pattern                 | Command                 | What                                                 |
| ----------------------- | ----------------------- | ---------------------------------------------------- |
| `*.test.ts`             | `pnpm test`             | Unit tests: aggregates, value objects, pure services |
| `*.integration.test.ts` | `pnpm test:integration` | Application handlers with real PostgreSQL + real DI  |
| `*.http.test.ts`        | `pnpm test:integration` | HTTP routes through Express + Supertest              |

---

## Test Environment

Integration and HTTP tests use `TestEnvironment` as the main test infrastructure entry point.

```ts
import { environment } from '@tests/setup'

const container = environment.container.container
const database = environment.database
const transaction = environment.transaction
const app = environment.app
```

`TestEnvironment` is responsible for:

1. Generating a unique PostgreSQL schema.
2. Creating and migrating that schema.
3. Creating the test DI container.
4. Creating `TestDatabase`.
5. Creating `TestTransaction`.
6. Exposing the Express application when HTTP support is enabled.
7. Disconnecting Prisma and dropping the schema after the test environment stops.

The environment is started in `setup.ts`:

```ts
beforeAll(async () => {
  await environment.start()
})

afterAll(async () => {
  await environment.stop()
})
```

The default environment is created as:

```ts
export const environment = new TestEnvironment()
```

For HTTP tests, the environment must be created with:

```ts
new TestEnvironment({ http: true })
```

because `http: true` adds `HttpContext` to the DI container.

---

## Database Isolation

Test isolation has two levels.

### Per test environment — PostgreSQL schema

When `TestEnvironment.start()` runs, it generates a unique schema:

```text
test_<uuid>
```

`TestSchema.createAndMigrateSchema()` then:

1. Creates the schema.
2. Sets the PostgreSQL `search_path`.
3. Reads all Prisma migrations from `prisma/migrations`.
4. Applies them directly through `pg`.

The schema name is also stored in:

```ts
process.env.TEST_SCHEMA
```

`PersistenceContext` uses `TEST_SCHEMA` when configuring Prisma so that the application operates inside the test schema.

When the environment stops, the schema is removed with:

```sql
DROP SCHEMA "<schema>" CASCADE
```

Therefore test environments do not share database tables with each other.

---

### Per test — transaction rollback

Individual tests can use `TestTransaction.rollback()`:

```ts
await environment.transaction.rollback(async () => {
  // test
})
```

`TestTransaction` starts a real Prisma transaction and executes the callback through `TransactionContext`:

```ts
await prisma.$transaction(async (tx) => {
  result = await context.run(tx, fn)

  throw new TestRollback()
})
```

The intentional `TestRollback` exception causes the transaction to roll back.

The exception is caught by `TestTransaction`, so the test receives the callback result normally.

All repositories must use `TransactionContext.client` for database operations so that their writes participate in the active test transaction.

No manual database cleanup is required when the test uses transaction isolation.

---

## Containers

### Integration tests

Integration tests use `TestContainer` without HTTP:

```ts
const environment = new TestEnvironment()
await environment.start()

const container = environment.container.container
```

The container wires:

- `PersistenceContext`
- `AdaptersContext`
- `ClientContext`
- `UserContext`
- `ProjectContext`

No HTTP infrastructure is added.

---

### HTTP tests

HTTP tests use:

```ts
const environment = new TestEnvironment({ http: true })
```

The normal application contexts are created and `HttpContext` is added.

`HttpContext` provides the Express application, routes and HTTP middleware.

The application can then be passed to Supertest:

```ts
const app = environment.app

await request(app)
  .post('/some/route')
  .send({...})
```

---

## TestContainer

`TestContainer` is responsible only for constructing the test DI container.

```ts
const testContainer = new TestContainer()
const container = testContainer.container
```

HTTP support is optional:

```ts
const testContainer = new TestContainer({ http: true })
```

The container always includes:

```text
PersistenceContext
AdaptersContext
ClientContext
UserContext
ProjectContext
```

With `http: true`:

```text
HttpContext
```

is added as well.

`ServiceContextBuilder` builds all bindings into the Inversify container.

---

## TestDatabase

`TestDatabase` provides access to the Prisma client associated with the test environment.

```ts
const client = environment.database.client
```

The returned client is:

```ts
PrismaClient | Prisma.TransactionClient
```

When a transaction is active, `TransactionContext.client` resolves to the transaction client.

`TestDatabase.disconnect()` disconnects the underlying `PrismaProvider`.

---

## TestTransaction

`TestTransaction` provides explicit transaction isolation:

```ts
await environment.transaction.rollback(async () => {
  const result = await handler.execute(command)

  expect(result).toBeDefined()
})
```

The transaction is always rolled back after the callback completes.

If the callback itself throws an application error, that error is propagated normally.

Only the internal `TestRollback` exception is swallowed.

---

## Seeds

Seeds are independent and compose through explicit IDs.

Seeds do **not** implicitly create unrelated parent entities.

### Client

```ts
const client = await seedClient(container)
```

Creates only a Client.

```ts
seedClient(container, {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
})
```

Returns `AdminRegisterClientResult`.

---

### Project

```ts
const project = await seedProject(container, clientId)
```

Creates a Project for an existing Client.

The Client must therefore be created separately:

```ts
const client = await seedClient(container)
const project = await seedProject(container, client.clientId)
```

---

### Project field

```ts
const field = await seedProjectField(container, projectId, clientId)
```

Creates a `ProjectField` for an existing Project and Client.

Its defaults are:

```text
name: "bio"
type: "string"
required: false
```

Overrides can be provided:

```ts
await seedProjectField(container, projectId, clientId, {
  name: 'age',
  type: 'number',
  required: true,
})
```

---

### User

```ts
const user = await seedUser(container, projectId)
```

Creates a User for an existing Project.

The required hierarchy must be created explicitly:

```ts
const client = await seedClient(container)
const project = await seedProject(container, client.clientId)
const user = await seedUser(container, project.projectId)
```

This makes fixture dependencies explicit and allows tests to create only the entities they need.

---

## Seed Composition

Seeds can be composed when a test needs a larger fixture.

For example:

```ts
const client = await seedClient(container)

const project = await seedProject(container, client.clientId)

const field = await seedProjectField(container, project.projectId, client.clientId)

const user = await seedUser(container, project.projectId)
```

The important rule is:

> **A seed creates one logical entity and receives existing relationship IDs as arguments.**

Avoid seeds that silently create unrelated parent entities.

---

## Integration Test Template

Integration tests should resolve their handlers from the test container and use the real database.

Example:

```ts
import { describe, expect, it } from 'vitest'

import { MyHandler } from './MyHandler'
import { MyCommand } from './MyCommand'

import { environment } from '@tests/setup'
import { seedClient } from '@tests/seeds/client'
import { seedProject } from '@tests/seeds/project'

const container = environment.container.container
const handler = container.get(MyHandler)

describe('MyHandler', () => {
  it('happy path', async () => {
    await environment.transaction.rollback(async () => {
      const client = await seedClient(container)

      const project = await seedProject(container, client.clientId)

      const result = await handler.execute(
        new MyCommand(
          project.projectId,
          // ...
        ),
      )

      expect(result).toBeDefined()
    })
  })
})
```

If transaction isolation is provided by a shared test helper, use that helper instead. The important requirement is that each test's database writes are rolled back.

---

## JWT → Session ID

When a command or handler requires a `sessionId`, it can be extracted from the JWT:

```ts
import jwt from 'jsonwebtoken'

const getSessionId = (token: string) => (jwt.decode(token) as { sid: string }).sid
```

This should be used when the test needs to connect an authentication token to the corresponding session entity.

---

## HTTP Test Template

HTTP tests use the Express application and Supertest.

```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { environment } from '@tests/setup'

const app = environment.app
const container = environment.container.container

describe('POST /some/route', () => {
  it('returns 201 on valid body', async () => {
    await environment.transaction.rollback(async () => {
      const res = await request(app).post('/some/route').send({
        // ...
      })

      const body = res.body as {
        field?: string
      }

      expect(res.status).toBe(201)
      expect(typeof body.field).toBe('string')
    })
  })
})
```

HTTP tests use the real:

- Express application
- routes
- controllers
- validators
- middleware
- DI container
- application handlers
- repositories
- PostgreSQL database

---

## Seeds in HTTP Tests

Seeds can be created directly through the DI container.

For example:

```ts
const client = await seedClient(container)

const project = await seedProject(container, client.clientId)
```

Using the application handlers for setup is preferred over inserting records directly with Prisma because it keeps test data consistent with application/business rules.

---

## Cookies

Refresh tokens are delivered through HTTP-only cookies.

To inspect cookies:

```ts
const cookies = (res.headers['set-cookie'] ?? []) as string[]

expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true)
```

To send cookies to another request:

```ts
.set('Cookie', cookies)
```

To verify logout cleared the refresh token:

```ts
expect(cookies.some((cookie) => cookie.includes('refresh_token=;'))).toBe(true)
```

---

## Unit Test Template

Unit tests do not use:

- `TestEnvironment`
- PostgreSQL
- Prisma
- Inversify container
- seeds
- HTTP
- transaction isolation

They test domain objects and pure logic directly.

```ts
import { describe, expect, it } from 'vitest'

import { Client } from './Client'
import { Name } from '@valueObjects/Name'

describe('Client', () => {
  it('renames and returns a new instance', () => {
    const client = Client.create(...)

    const renamed = client.reName(
      Name.create('New'),
    )

    expect(renamed.name.value).toBe('New')
    expect(client).not.toBe(renamed)
  })
})
```

Unit tests should remain fast and independent of infrastructure.

---

## Error → HTTP Status

| Error class         | Status |
| ------------------- | ------ |
| `ValidationError`   | 400    |
| `UnauthorizedError` | 401    |
| `NotFoundError`     | 404    |
| `ConflictError`     | 409    |

These mappings should be tested at the HTTP layer when verifying controller/error-handler behavior.

Business error behavior itself should be tested at the application/domain layer.

---

## Known HTTP Testing Constraint

`UserAuthMiddleware` and `ApiKeyAuthMiddleware` both use the `Authorization` header.

The current HTTP authentication design therefore cannot represent both tokens simultaneously when both middleware expect different authentication values from the same header.

Routes requiring both `apiKey` and `userJWT`, such as:

```text
GET    /me
PATCH  /me/*
DELETE /me
GET    /me/sessions
DELETE /me/sessions/:sessionId
```

cannot be correctly exercised through HTTP with the current authentication contract.

For those cases, test the underlying application handlers directly.

---

## Testing Philosophy

The test system intentionally uses real infrastructure for integration tests:

```text
Application Handler
        ↓
Real DI Container
        ↓
Real Repositories
        ↓
Real Prisma
        ↓
PostgreSQL
```

Isolation is provided by:

```text
Test Environment
      ↓
Unique PostgreSQL Schema
      ↓
Test Transaction
      ↓
Automatic Rollback
```

The goal is to avoid mocking infrastructure that the integration test is specifically intended to verify.

Unit tests remain isolated and fast, while integration tests verify the complete application/DI/persistence path.
