---
title: Phase 3.3.6 — Application Service Tests
date: 2026-08-15
status: done
priority: medium — 7 services in src/application/services/ have no dedicated tests
---

# Phase 3.3.6 — Application Service Tests

All handlers under `src/application/commands/` have integration tests. Services under `src/application/services/` have zero coverage except `SchemaBuilderService` (added in 3.3.5).

Services to cover:

| Service | Test type | Reason |
|---|---|---|
| `ApiKeyService` | unit | pure logic, no DB |
| `ProjectAccessService` | unit | mock repos, pure guard logic |
| `ClientRefreshTokenService` | unit | mock repos + UnitOfWork, validate/reuse logic |
| `UserRefreshTokenService` | unit | same as Client variant |
| `ClientAuthService` | integration | too many collaborators, real container cheaper |
| `UserAuthService` | integration | same |
| `UserFieldService` | unit | mock repos, pure map/merge logic |

---

## 3.3.6.1 — ApiKeyService unit tests

File: `src/application/services/ApiKeyService.test.ts`

```ts
const makeHasher = (fn = (s: string) => `hash:${s}`): Hasher => ({ hash: fn })
const makeKeyGen = (key = 'raw-key'): KeyGenerator => ({ generate: () => key })
const makeIdGen = (id = 'id-1'): IdGenerator => ({ generate: () => id })

const makeService = () =>
  new ApiKeyService(makeIdGen(), makeHasher(), makeKeyGen())
```

### Cases for `create()`

| case | expect |
|---|---|
| returns rawKey from keyGenerator | `result.rawKey === 'raw-key'` |
| hash of rawKey stored on ApiKey | `result.apiKey.hash === 'hash:raw-key'` |
| ApiKey not revoked | `result.apiKey.revoked === false` |
| ApiKey name matches input | `result.apiKey.name.value === 'my-key'` |

### Cases for `verify()`

| case | expect |
|---|---|
| correct rawKey → true | `verify('raw-key', 'hash:raw-key') === true` |
| wrong rawKey → false | `verify('bad-key', 'hash:raw-key') === false` |
| different length hash → false (no buffer panic) | `verify('x', 'hash:x:extra') === false` |

Note: length check guards against `timingSafeEqual` throwing on mismatched buffers.

---

## 3.3.6.2 — ProjectAccessService unit tests

File: `src/application/services/project/ProjectAccessService.test.ts`

```ts
const makeProjects = (project: Project | null = null): ProjectRepository =>
  ({ findById: vi.fn().mockResolvedValue(project) }) as unknown as ProjectRepository

const makeUsers = (user: User | null = null): UserRepository =>
  ({ findById: vi.fn().mockResolvedValue(user) }) as unknown as UserRepository
```

### Cases for `verifyByProjectId()`

| case | expect |
|---|---|
| project not found | throws `NotFoundError` with code `PROJECT_NOT_FOUND` |
| project found but wrong `ownerId` | throws `NotFoundError` with code `ACCESS_DENIED` |
| project found and `ownerId` matches | returns project |

### Cases for `verifyByUserId()`

| case | expect |
|---|---|
| user not found | throws `NotFoundError` with code `USER_NOT_FOUND` |
| user found but project not found | throws `NotFoundError` with code `PROJECT_NOT_FOUND` |
| project found but wrong `ownerId` | throws `NotFoundError` with code `ACCESS_DENIED` |
| all valid | returns `{ project, user }` |

Use minimal stubs for `Project` and `User` — only set `id`, `ownerId`, `projectId`.

---

## 3.3.6.3 — ClientRefreshTokenService unit tests

File: `src/application/services/refresh-token/ClientRefreshTokenService.test.ts`

Focus: `requireValid()`, `detectReuse()`, `generate()`. `rotate()` delegates to `unitOfWork.execute` — cover the happy path only.

```ts
const makeToken = (overrides: Partial<...> = {}): ClientRefreshToken => ...
const makeRepo = (token: ClientRefreshToken | null = null) => ({
  findByHash: vi.fn().mockResolvedValue(token),
  revokeAllBySessionId: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
})
const makeUoW = (): UnitOfWork => ({
  execute: vi.fn((fn) => fn()),
})
const makeConfig = (): ServerConfig => ({ refreshTokenTtlMs: 60_000 } as ServerConfig)
const makeHasher = (): Hasher => ({ hash: (s) => `h:${s}` })
const makeKeyGen = (): KeyGenerator => ({ generate: () => 'raw' })
```

### `requireValid()`

| case | expect |
|---|---|
| token not found in repo | throws `UnauthorizedError` code `REFRESH_TOKEN_INVALID` |
| token found but `isExpired()` | throws `UnauthorizedError` code `REFRESH_TOKEN_EXPIRED` |
| token found but `isRevoked()` | throws `UnauthorizedError` code `REFRESH_TOKEN_REVOKED` |
| token found, valid | returns token |

Build expired/revoked tokens by constructing `ClientRefreshToken` with past `expiresAt` or set `revokedAt`.

### `detectReuse()`

| case | expect |
|---|---|
| token not used → no throw | resolves normally |
| token already used | calls `revokeAllBySessionId(token.sessionId)`, throws `UnauthorizedError` code `REFRESH_TOKEN_REUSE_DETECTED` |

### `generate()`

| case | expect |
|---|---|
| returns `rawRefreshToken`, `hash`, `expiresAt` | `rawRefreshToken === 'raw'`, `hash === 'h:raw'`, `expiresAt` is future Date |

---

## 3.3.6.4 — UserRefreshTokenService unit tests

File: `src/application/services/refresh-token/UserRefreshTokenService.test.ts`

Identical structure to 3.3.6.3, substituting `UserRefreshToken`, `UserRefreshTokenRepository`, `UserRefreshTokenFactory`. Copy cases exactly — both services are structurally identical; the tests catch drift if one diverges.

---

## 3.3.6.5 — ClientAuthService integration tests

File: `src/application/services/auth/ClientAuthService.integration.test.ts`

Use `getTestContainer()` + `truncateAll()` (same as command handler tests).

```ts
const container = getTestContainer()
const service = container.get(ClientAuthService)
const registerHandler = container.get(RegisterClientHandler)
```

Seed a registered client before each token-related test.

### `login()`

| case | expect |
|---|---|
| valid context | returns `{ accessToken, refreshToken }`, both truthy |
| creates session in DB | second login also succeeds (sessions are independent) |

### `refresh()`

| case | expect |
|---|---|
| valid rawToken | returns new `{ accessToken, refreshToken }` |
| old token after rotate | throws `UnauthorizedError` code `REFRESH_TOKEN_REUSE_DETECTED` — because `detectReuse` sees it's used |
| expired rawToken | throws `UnauthorizedError` code `REFRESH_TOKEN_EXPIRED` |

Build an expired scenario by directly manipulating the token's `expiresAt` via Prisma after seeding (or construct expired token via test helper if available).

---

## 3.3.6.6 — UserAuthService integration tests

File: `src/application/services/auth/UserAuthService.integration.test.ts`

Same pattern as 3.3.6.5. Use existing seed helpers (`projectSeed`, `userSeed`).

### `login()`

| case | expect |
|---|---|
| valid context with existing project | returns `{ accessToken, refreshToken }` |
| projectId does not exist | throws `UnauthorizedError` code `PROJECT_NOT_FOUND` |

### `refresh()`

| case | expect |
|---|---|
| valid rawToken | returns new token pair |
| reused rawToken | throws `UnauthorizedError` code `REFRESH_TOKEN_REUSE_DETECTED` |

---

## 3.3.6.7 — UserFieldService unit tests

File: `src/application/services/user/UserFieldService.test.ts`

```ts
const makeProjectFields = (fields: ProjectField[] = []): ProjectFieldRepository =>
  ({ findByProjectId: vi.fn().mockResolvedValue(fields) }) as unknown as ProjectFieldRepository

const makeUserFields = (values: UserFieldValue[] = []): UserFieldValueRepository =>
  ({ findByUserId: vi.fn().mockResolvedValue(values) }) as unknown as UserFieldValueRepository
```

### `getFieldsWithValues()`

| case | expect |
|---|---|
| no fields → empty array | returns `[]` |
| field with matching value | `value` is the UserFieldValue's value |
| field with no matching value | `value` is `null` |
| multiple fields, mixed | correct value mapping via fieldId |

---

## Priority order

1. `ApiKeyService` — pure, zero deps
2. `ProjectAccessService` — pure guard logic, no DB
3. `UserFieldService` — pure map logic, no DB
4. `ClientRefreshTokenService` — critical security path
5. `UserRefreshTokenService` — same
6. `ClientAuthService` — needs DB, highest integration value
7. `UserAuthService` — needs DB
