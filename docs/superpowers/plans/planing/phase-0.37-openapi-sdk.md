---
title: Phase 0.37 — OpenAPI Spec & TypeScript SDK
date: 2026-08-15
status: planning
priority: low — ship after API is stable; spec churn during active development wastes effort
---

# Phase 0.37 — OpenAPI Spec & TypeScript SDK

The service is positioned as auth-as-a-service. Consumers (project owners integrating the auth SDK) need two things: a machine-readable API contract and a typed client library. This phase delivers both.

**Prerequisite:** API surface must be stable. Do not generate SDK while endpoints are actively changing (Phase 0.33 password reset, etc.). Start this phase after Phase 0.33 is done and deployed.

---

## 0.37.1 — OpenAPI Specification

**Approach:** code-first via `zod-to-openapi` — reuse existing Zod validators to generate the spec. No separate hand-written YAML.

```bash
pnpm add @asteasolutions/zod-to-openapi
```

**Setup:**
```ts
// src/presentation/http/openapi/registry.ts
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'

export const registry = new OpenAPIRegistry()

// Register schemas using existing Zod validators:
registry.register('RegisterClientBody', RegisterClientValidator)
registry.register('LoginClientBody', LoginClientValidator)
// ...

// Register paths:
registry.registerPath({
  method: 'post',
  path: '/client/register',
  summary: 'Register a new client account',
  request: { body: { content: { 'application/json': { schema: RegisterClientValidator } } } },
  responses: {
    201: { description: 'Registered', content: { 'application/json': { schema: RegisterClientResponseSchema } } },
    409: { description: 'Email already in use' },
    400: { description: 'Validation error' },
  },
})
```

**Spec generation script:**
```ts
// scripts/generate-openapi.ts
import { registry } from '../src/presentation/http/openapi/registry'
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { writeFileSync } from 'fs'

const generator = new OpenApiGeneratorV31(registry.definitions)
const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: { title: 'Auth Service API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:8080' }],
})

writeFileSync('openapi.json', JSON.stringify(spec, null, 2))
```

Add to `package.json`:
```json
"scripts": {
  "openapi": "tsx scripts/generate-openapi.ts"
}
```

**Serve spec at runtime:**
```ts
// routes/docs.ts
import spec from '../../openapi.json' assert { type: 'json' }
import swaggerUi from 'swagger-ui-express'

router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec))
router.get('/openapi.json', (_req, res) => res.json(spec))
```

```bash
pnpm add swagger-ui-express @types/swagger-ui-express
```

**Two audiences for the spec:**
1. `GET /docs` — Swagger UI for humans (project owners exploring the API)
2. `GET /openapi.json` — machine-readable for SDK generation

---

## 0.37.2 — TypeScript SDK

**Two SDK surfaces:**

### SDK Surface A — Client SDK (for project owners)
Covers all `/client/*` endpoints. Project owners use this to manage their own account and projects.

### SDK Surface B — User SDK (for end-user apps)
Covers all `/projects/:projectId/users/*` endpoints. This is what project owners embed in their apps.

**Approach:** generate from OpenAPI spec using `openapi-typescript` + `openapi-fetch`.

```bash
# Generate types from spec
pnpm add -D openapi-typescript
npx openapi-typescript openapi.json -o src/sdk/schema.d.ts

# Runtime fetch client (typed)
pnpm add openapi-fetch
```

**Client wrapper:**
```ts
// src/sdk/AuthServiceClient.ts
import createClient from 'openapi-fetch'
import type { paths } from './schema.js'

export class AuthServiceClient {
  private readonly client

  constructor(baseUrl: string) {
    this.client = createClient<paths>({ baseUrl })
  }

  async register(body: { name: string; email: string; password: string }) {
    const { data, error } = await this.client.POST('/client/register', { body })
    if (error) throw new AuthServiceError(error)
    return data
  }

  async login(body: { email: string; password: string }) {
    const { data, error } = await this.client.POST('/client/login', { body })
    if (error) throw new AuthServiceError(error)
    return data
  }
  // ...
}
```

**User SDK with project scoping:**
```ts
// src/sdk/ProjectUserClient.ts
export class ProjectUserClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async registerUser(projectId: string, body: { email: string; password: string; fields?: Record<string, unknown> }) {
    // ...
  }
}
```

**Distribution options:**

| Option | When |
|--------|------|
| Publish to npm as `@yourname/auth-sdk` | Public service, multiple consumers |
| Keep in repo under `src/sdk/` | Internal use, single consumer app |
| Separate repo | When SDK has its own release cycle |

**Recommendation:** keep SDK in the same repo during early development. Extract to a separate package when the first real consumer (e.g., a frontend app) needs to depend on it without pulling in the whole service source.

---

## 0.37.3 — SDK Test Coverage

SDK types come from the generated spec — type errors catch mismatches at compile time. Still need runtime tests:

- `AuthServiceClient.register()` → 201 (integration vs real server)
- `AuthServiceClient.login()` → 200 + token returned
- `ProjectUserClient.registerUser()` → 201 with required fields
- Error cases: 401, 409, 400 — SDK throws `AuthServiceError` with correct code

**Test approach:** spin up real server with `supertest` or `fetch` against `http://localhost:PORT`.

---

## Priority Order

1. OpenAPI spec generation script — low effort, immediate documentation value
2. `/docs` Swagger UI — trivial to add once spec exists
3. Type generation (`openapi-typescript`) — 1 command, instant typed client
4. `AuthServiceClient` wrapper — write after type generation, covers client routes
5. `ProjectUserClient` wrapper — lower priority, same pattern
6. SDK tests — add alongside each wrapper method
