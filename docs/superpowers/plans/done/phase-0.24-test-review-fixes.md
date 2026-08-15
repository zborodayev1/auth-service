---
title: Phase 0.24 — Test Review Fixes
date: 2026-08-12
status: done
priority: medium — test correctness and security gaps
---

# Phase 0.24 — Test Review Fixes

**Goal:** Fix all issues found in the phase-3.5 integration test suite code review: config hardening, mechanical cleanup, auth test gaps, missing ownership boundary tests, and handler-level security gaps found during review.

**Architecture:** Tasks 1-4 touch test files and config only. Tasks 5, 9 also touch production handler files — noted explicitly in each task. Tests hit a real PostgreSQL DB via the singleton DI container.

**Tech Stack:** Vitest, TypeScript, Prisma, InversifyJS DI container.

## Global Constraints

- No mocking repositories or handlers — real DB only.
- All test files use `getTestContainer()` from `src/tests/helpers/container.ts`.
- `truncateAll(container)` runs in `beforeEach` — do not add `afterAll` to individual test files.
- Run integration tests: `pnpm vitest run --config vitest.integration.config.ts`
- Nil UUID constant for "unknown actor": `'00000000-0000-0000-0000-000000000000'`
- Path aliases: `@shared/`, `@aggregates/`, `@valueObjects/`, `@infra/`, `@config/`, `@ports/`, `@generated/`

---

### Task 1: Config hardening + truncateAll sync warning

**Files:**

- Modify: `vitest.integration.config.ts`
- Modify: `src/tests/helpers/container.ts`
- Modify: `src/tests/helpers/db.ts`

- [x] **Step 1: Add testTimeout to integration config**

Open `vitest.integration.config.ts`. Add `testTimeout: 15000` inside the `test` block:

```ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['reflect-metadata', './src/tests/setup.integration.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
  resolve: {
    /* unchanged */
  },
})
```

- [x] **Step 2: Reset container singleton on disconnect**

Open `src/tests/helpers/container.ts`. In `disconnectTestDb`, set `_container = null` before disconnect so the next test file gets a fresh container and Prisma connection:

```ts
export async function disconnectTestDb(): Promise<void> {
  if (!_container) return
  const prisma = _container.get(PrismaProvider)
  _container = null
  await prisma.$disconnect()
}
```

Update the comment above `getTestContainer` to:

```ts
// _container is reset to null by disconnectTestDb() after each file's afterAll.
// Next file gets a fresh container with a new Prisma connection.
// Do NOT enable fileParallelism without replacing this with a per-file factory.
```

- [x] **Step 3: Add sync warning to truncateAll**

Open `src/tests/helpers/db.ts`. Add a comment immediately before the `$transaction` call:

```ts
// KEEP IN SYNC with prisma/schema.prisma — add new models here or data leaks between tests.
await prisma.$transaction([
  prisma.userFieldValue.deleteMany(),
  // ... rest unchanged
])
```

- [x] **Step 4: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all tests pass.

---

### Task 2: Mechanical cleanup

**Files:**

- Modify: `src/application/commands/project/CreateProject/CreateProjectHandler.integration.test.ts`
- Modify: `src/application/commands/user/RegisterUser/RegisterUserHandler.integration.test.ts`
- Modify: `src/application/commands/client/RegisterClient/RegisterClientHandler.integration.test.ts`
- Modify: `src/application/queries/client/GetClientProfile/GetClientProfileHandler.integration.test.ts`
- Modify: `src/application/commands/user/UpdateUserField/UpdateUserFieldHandler.integration.test.ts`
- Modify: `src/application/commands/user/DeleteUserSelf/DeleteUserSelfHandler.integration.test.ts`

**Interfaces:**

- Consumes: `seedProject(container)` from `../../../../tests/helpers/projectSeed`

- [x] **Step 1: Remove redundant test in CreateProjectHandler**

Open `src/application/commands/project/CreateProject/CreateProjectHandler.integration.test.ts`.

Delete the entire second `it` block — `'raw apiKey is a non-empty string'`:

```ts
// DELETE this entire block:
it('raw apiKey is a non-empty string', async () => {
  const { clientId } = await seedClient()

  const { apiKey } = await handler.execute(
    new CreateProjectCommand(PROJECT_SEED.project.name, clientId),
  )

  expect(typeof apiKey).toBe('string')
  expect(apiKey.length).toBeGreaterThan(0)
})
```

Reason: `toBeTruthy()` in the first test already proves it's a non-empty string. This test asserts a strict subset.

- [x] **Step 2: Deduplicate setupProject in RegisterUserHandler**

Open `src/application/commands/user/RegisterUser/RegisterUserHandler.integration.test.ts`.

Add import for the shared helper:

```ts
import { seedProject, PROJECT_SEED } from '../../../../tests/helpers/projectSeed'
```

Keep the existing `RegisterClientHandler` and `CreateProjectHandler` imports — they are still needed by the third test (`'allows same email in different projects'`) which creates a second client/project manually.

Delete the local `setupProject` function:

```ts
// DELETE:
const setupProject = async (): Promise<string> => {
  const { clientId } = await registerClient.execute(
    new RegisterClientCommand(
      SEED.client.name,
      SEED.client.email,
      SEED.client.password,
      null,
      null,
      null,
    ),
  )
  const { projectId } = await createProject.execute(
    new CreateProjectCommand(SEED.project.name, clientId),
  )
  return projectId
}
```

In the first two `it` blocks, replace `await setupProject()` with:

```ts
const { projectId } = await seedProject(container)
```

The third test (`'allows same email in different projects'`) already uses inline client+project creation for `projectId2` — leave it as is, just replace its `await setupProject()` for `projectId1`:

```ts
const { projectId: projectId1 } = await seedProject(container)
```

- [x] **Step 3: Add UUID format assertion for clientId in RegisterClientHandler**

Open `src/application/commands/client/RegisterClient/RegisterClientHandler.integration.test.ts`.

In the `'returns clientId, accessToken, refreshToken'` test, replace:

```ts
expect(result.clientId).toBeTruthy()
```

with:

```ts
expect(result.clientId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
```

Leave `accessToken` and `refreshToken` as `toBeTruthy()` — they are JWTs, not UUIDs.

- [x] **Step 4: Add UUID format assertion for projectId in CreateProjectHandler**

Open `src/application/commands/project/CreateProject/CreateProjectHandler.integration.test.ts`.

In the first (now only) test, replace:

```ts
expect(result.projectId).toBeTruthy()
```

with:

```ts
expect(result.projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
```

Leave `apiKey` as `toBeTruthy()` — it is a raw crypto key string, not a UUID.

- [x] **Step 5: Remove stray double blank lines**

In each file below, there is exactly one double blank line before the first `it(...)` inside the `describe` block (after `beforeEach`). Remove the extra blank line, leaving one.

Files to fix:

- `src/application/queries/client/GetClientProfile/GetClientProfileHandler.integration.test.ts`
- `src/application/commands/user/RegisterUser/RegisterUserHandler.integration.test.ts`
- `src/application/commands/user/UpdateUserField/UpdateUserFieldHandler.integration.test.ts`
- `src/application/commands/user/DeleteUserSelf/DeleteUserSelfHandler.integration.test.ts`

- [x] **Step 6: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all tests pass.

---

### Task 3: Strengthen auth flow tests

**Files:**

- Modify: `src/application/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler.integration.test.ts`
- Modify: `src/application/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler.integration.test.ts`
- Modify: `src/application/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler.integration.test.ts`

**Interfaces:**

- `LoginClientHandler` / `LoginClientCommand` — already imported in LogoutAll file; need to add to LogoutCurrent
- `RefreshClientAccessTokenHandler` / `RefreshClientAccessTokenCommand` — already imported in all three files
- `RegisterClientCommand(name, email, password, null, null, null)` — 6 args

- [x] **Step 1: Verify new rotated token is usable**

Open `RefreshClientAccessTokenHandler.integration.test.ts`. Add after the existing `'returns a different refreshToken after rotation'` test:

```ts
it('new token from rotation is usable', async () => {
  const { refreshToken } = await seed()

  const { refreshToken: newToken } = await refreshHandler.execute(
    new RefreshClientAccessTokenCommand(refreshToken),
  )

  await expect(
    refreshHandler.execute(new RefreshClientAccessTokenCommand(newToken)),
  ).resolves.toBeTruthy()
})
```

- [x] **Step 2: Chained rotation test**

In the same file, add after the test above:

```ts
it('chained rotation: token2 works, then fails after token3 issued', async () => {
  const { refreshToken: token1 } = await seed()

  const { refreshToken: token2 } = await refreshHandler.execute(
    new RefreshClientAccessTokenCommand(token1),
  )
  const { refreshToken: token3 } = await refreshHandler.execute(
    new RefreshClientAccessTokenCommand(token2),
  )

  expect(token3).toBeTruthy()
  await expect(refreshHandler.execute(new RefreshClientAccessTokenCommand(token2))).rejects.toThrow(
    UnauthorizedError,
  )
})
```

- [x] **Step 3: LogoutAll — cross-client isolation**

Open `LogoutAllClientSessionsHandler.integration.test.ts`. The file already has `registerHandler` and `refreshHandler` at module level.

Add a new `it` block:

```ts
it('does not invalidate sessions of other clients', async () => {
  const { clientId: clientIdA, refreshToken: tokenA } = await seed()
  const { refreshToken: tokenB } = await registerHandler.execute(
    new RegisterClientCommand(
      'Other Client',
      'other@example.com',
      VALID.password,
      null,
      null,
      null,
    ),
  )

  await handler.execute(new LogoutAllClientSessionsCommand(clientIdA))

  await expect(refreshHandler.execute(new RefreshClientAccessTokenCommand(tokenA))).rejects.toThrow(
    UnauthorizedError,
  )

  await expect(
    refreshHandler.execute(new RefreshClientAccessTokenCommand(tokenB)),
  ).resolves.toBeTruthy()
})
```

- [x] **Step 4: LogoutCurrentSession — other session remains valid**

Open `LogoutCurrentClientSessionHandler.integration.test.ts`. The file already imports `accessTokenService` and `refreshHandler`.

Add imports for `LoginClientHandler` and `LoginClientCommand` if not present:

```ts
import { LoginClientHandler } from '../LoginClient/LoginClientHandler'
import { LoginClientCommand } from '../LoginClient/LoginClientCommand'
```

Add module-level resolution if not present:

```ts
const loginHandler = container.get(LoginClientHandler)
```

Add test after `'refresh fails after logout'`:

```ts
it('other sessions remain valid after single logout', async () => {
  const { accessToken: accessToken1, clientId } = await seed()
  const { sessionId: sessionId1 } = accessTokenService.verify(accessToken1)

  const { refreshToken: refreshToken2 } = await loginHandler.execute(
    new LoginClientCommand(VALID.password, VALID.email, null, null, null),
  )

  await handler.execute(new LogoutCurrentClientSessionCommand(sessionId1, clientId))

  await expect(
    refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken2)),
  ).resolves.toBeTruthy()
})
```

- [x] **Step 5: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all tests pass including the 4 new ones.

---

### Task 4: Ownership boundary tests

**Files:**

- Modify: `src/application/commands/project/DeleteProject/DeleteProjectHandler.integration.test.ts`
- Modify: `src/application/commands/project/RenameProject/RenameProjectHandler.integration.test.ts`
- Modify: `src/application/commands/project/AddProjectField/AddProjectFieldHandler.integration.test.ts`
- Modify: `src/application/commands/project/DeleteProjectField/DeleteProjectFieldHandler.integration.test.ts`
- Modify: `src/application/commands/project/UpdateProjectField/UpdateProjectFieldHandler.integration.test.ts`

**Interfaces:**

- All files already import `NotFoundError` or need: `import { NotFoundError } from '@shared/errors/NotFoundError'`
- `seedProject(container)` from `../../../../tests/helpers/projectSeed` — already imported in all these files or add it
- `seedProjectWithField(container)` — already imported in DeleteProjectField and UpdateProjectField files

Command signatures (verified from existing tests):

- `DeleteProjectCommand(clientId, projectId)`
- `RenameProjectCommand(clientId, projectId, name)`
- `AddProjectFieldCommand(projectId, clientId, name, type, required, defaultValue, allowedValues)` — e.g. `AddProjectFieldCommand('00000000...', projectId, 'field', 'string', false, null, [])`
- `DeleteProjectFieldCommand(fieldId, projectId, clientId, force)`
- `UpdateProjectFieldCommand(projectId, clientId, fieldId, name, required, defaultValue, allowedValues)`

- [x] **Step 1: DeleteProject — ownership test**

Open `src/application/commands/project/DeleteProject/DeleteProjectHandler.integration.test.ts`.

Ensure `NotFoundError` is imported (add if missing):

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when clientId does not own the project', async () => {
  const { projectId } = await seedUser(container)

  await expect(
    handler.execute(new DeleteProjectCommand('00000000-0000-0000-0000-000000000000', projectId)),
  ).rejects.toThrow(NotFoundError)
})
```

Note: `seedUser` is already imported in this file.

- [x] **Step 2: RenameProject — ownership test**

Open `src/application/commands/project/RenameProject/RenameProjectHandler.integration.test.ts`.

Add `NotFoundError` import:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when clientId does not own the project', async () => {
  const { projectId } = await seedProject(container)

  await expect(
    handler.execute(
      new RenameProjectCommand('00000000-0000-0000-0000-000000000000', projectId, 'Hacked Name'),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 3: AddProjectField — ownership test**

Open `src/application/commands/project/AddProjectField/AddProjectFieldHandler.integration.test.ts`.

Add `NotFoundError` import (add if missing):

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block. The file already has the `addField` helper — reuse it with a fake `clientId`:

```ts
it('throws NotFoundError when clientId does not own the project', async () => {
  const { projectId } = await seedProject(container)

  await expect(addField('00000000-0000-0000-0000-000000000000', projectId)).rejects.toThrow(
    NotFoundError,
  )
})
```

- [x] **Step 4: DeleteProjectField — ownership test**

Open `src/application/commands/project/DeleteProjectField/DeleteProjectFieldHandler.integration.test.ts`.

`NotFoundError` is already imported. `seedProjectWithField` is already imported.

Add at end of `describe` block:

```ts
it('throws NotFoundError when clientId does not own the field', async () => {
  const { projectId, fieldId } = await seedProjectWithField(container)

  await expect(
    handler.execute(
      new DeleteProjectFieldCommand(
        fieldId,
        projectId,
        '00000000-0000-0000-0000-000000000000',
        false,
      ),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 5: UpdateProjectField — ownership test**

Open `src/application/commands/project/UpdateProjectField/UpdateProjectFieldHandler.integration.test.ts`.

`NotFoundError` and `seedProjectWithField` are already imported.

Add at end of `describe` block:

```ts
it('throws NotFoundError when clientId does not own the field', async () => {
  const { projectId, fieldId } = await seedProjectWithField(container)

  await expect(
    handler.execute(
      new UpdateProjectFieldCommand(
        projectId,
        '00000000-0000-0000-0000-000000000000',
        fieldId,
        'hackname',
        false,
        null,
        [],
      ),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 6: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all tests pass including the 5 new ownership tests.

---

### Task 5: Handler security fixes ⚠ production code

**Files:**

- Modify: `src/application/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler.ts`
- Modify: `src/application/commands/user/ChangeUserEmail/ChangeUserEmailHandler.ts`
- Modify: `src/application/commands/user/ChangeUserPassword/ChangeUserPasswordHandler.ts`

**Context:** All three handlers look up a domain object by ID but never verify ownership:

- `LogoutCurrentClientSession`: fetches session by `sessionId`, checks `isActive()`, but never checks `session.clientId === command.clientId` — wrong client can revoke any session if they know the sessionId.
- `ChangeUserEmail` / `ChangeUserPassword`: fetch user by `userId`, but never check `user.projectId === command.projectId` — wrong project's handlers could operate on a user from another project, and the email-conflict check in ChangeUserEmail runs against the wrong project.

Both issues are safe in HTTP context (JWT guarantees matching IDs), but handlers are not self-protecting.

- [x] **Step 1: LogoutCurrentClientSession — add clientId ownership check**

Open `LogoutCurrentClientSessionHandler.ts`. After the `!session?.isActive()` guard (after L25), add:

```ts
if (session.clientId !== command.clientId) {
  throw new UnauthorizedError(
    'Session does not belong to this client',
    'SESSION_OWNERSHIP_VIOLATION',
    {
      sessionId: command.sessionId,
      commandClientId: command.clientId,
    },
  )
}
```

- [x] **Step 2: ChangeUserEmailHandler — combine notFound + project ownership check**

Open `ChangeUserEmailHandler.ts`. Find the block:

```ts
if (!user)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', { ... })
```

Replace with:

```ts
if (!user || user.projectId !== command.projectId)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
    userId: command.userId,
    projectId: command.projectId,
  })
```

- [x] **Step 3: ChangeUserPasswordHandler — same pattern**

Open `ChangeUserPasswordHandler.ts`. Find the block:

```ts
const user = await this.users.findById(command.userId)
if (!user)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', { ... })
```

Replace with:

```ts
const user = await this.users.findById(command.userId)
if (!user || user.projectId !== command.projectId)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
    userId: command.userId,
    projectId: command.projectId,
  })
```

- [x] **Step 4: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all existing tests pass (same-project paths unchanged).

---

### Task 6: Tests for handler security fixes

**Files:**

- Modify: `src/application/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler.integration.test.ts`
- Modify: `src/application/commands/user/ChangeUserEmail/ChangeUserEmailHandler.integration.test.ts`
- Modify: `src/application/commands/user/ChangeUserPassword/ChangeUserPasswordHandler.integration.test.ts`

**Interfaces:**

- `LogoutCurrentClientSessionCommand(sessionId, clientId)`
- `ChangeUserEmailCommand(userId, projectId, newEmail, password)` — 4 args
- `ChangeUserPasswordCommand(userId, projectId, currentPassword, newPassword)` — 4 args
- `seedProject(container)` from projectSeed — returns `{ clientId, projectId }`
- `seedUser, SEED` from userSeed — `SEED.user.password = 'userpassword123'`

- [x] **Step 1: LogoutCurrentClientSession — wrong clientId throws UnauthorizedError**

Open `LogoutCurrentClientSessionHandler.integration.test.ts`. Add at end of `describe` block:

```ts
it('throws UnauthorizedError when clientId does not own the session', async () => {
  const { accessToken } = await seed()
  const { sessionId } = accessTokenService.verify(accessToken)

  await expect(
    handler.execute(
      new LogoutCurrentClientSessionCommand(sessionId, '00000000-0000-0000-0000-000000000000'),
    ),
  ).rejects.toThrow(UnauthorizedError)
})
```

- [x] **Step 2: ChangeUserEmail — cross-project throws NotFoundError**

Open `ChangeUserEmailHandler.integration.test.ts`.

Add imports:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
import { seedProject } from '../../../../tests/helpers/projectSeed'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when projectId does not match user project', async () => {
  const { userId } = await seedUser(container)
  const { projectId: otherProjectId } = await seedProject(container)

  await expect(
    handler.execute(
      new ChangeUserEmailCommand(userId, otherProjectId, 'new@example.com', SEED.user.password),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 3: ChangeUserPassword — cross-project throws NotFoundError**

Open `ChangeUserPasswordHandler.integration.test.ts`.

Add imports (only those not already present):

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'
import { seedProject } from '../../../../tests/helpers/projectSeed'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when projectId does not match user project', async () => {
  const { userId } = await seedUser(container)
  const { projectId: otherProjectId } = await seedProject(container)

  await expect(
    handler.execute(
      new ChangeUserPasswordCommand(userId, otherProjectId, SEED.user.password, 'newpassword456'),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 4: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: 3 new tests pass.

---

### Task 7: Missing client command edge-case tests

**Files:**

- Modify: `src/application/commands/client/ChangeClientEmail/ChangeClientEmailHandler.integration.test.ts`
- Modify: `src/application/commands/client/ChangeClientPassword/ChangeClientPasswordHandler.integration.test.ts`

**Interfaces:**

- `ChangeClientEmailCommand(clientId, newEmail, password)`
- `ChangeClientPasswordCommand(clientId, currentPassword, newPassword)`
- `RefreshClientAccessTokenHandler` / `RefreshClientAccessTokenCommand`
- `NotFoundError` from `@shared/errors/NotFoundError`

- [x] **Step 1: ChangeClientEmail — NotFoundError for unknown clientId**

Open `ChangeClientEmailHandler.integration.test.ts`.

Add import:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError for unknown clientId', async () => {
  await expect(
    handler.execute(
      new ChangeClientEmailCommand(
        '00000000-0000-0000-0000-000000000000',
        'new@example.com',
        VALID.password,
      ),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 2: ChangeClientPassword — NotFoundError for unknown clientId**

Open `ChangeClientPasswordHandler.integration.test.ts`.

Add import:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError for unknown clientId', async () => {
  await expect(
    handler.execute(
      new ChangeClientPasswordCommand(
        '00000000-0000-0000-0000-000000000000',
        VALID.password,
        'newpassword456',
      ),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 3: ChangeClientPassword — existing refresh token invalid after password change**

In the same file, add imports:

```ts
import { RefreshClientAccessTokenHandler } from '../RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from '../RefreshClientAccessToken/RefreshClientAccessTokenCommand'
```

Add module-level resolution:

```ts
const refreshHandler = container.get(RefreshClientAccessTokenHandler)
```

Add at end of `describe` block:

```ts
it('existing refresh token becomes invalid after password change', async () => {
  const { clientId, refreshToken } = await seed()

  await handler.execute(new ChangeClientPasswordCommand(clientId, VALID.password, 'newpassword456'))

  await expect(
    refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken)),
  ).rejects.toThrow(UnauthorizedError)
})
```

- [x] **Step 4: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: 3 new tests pass.

---

### Task 8: Missing project ownership tests

**Files:**

- Modify: `src/application/commands/project/RenameApiKey/RenameApiKeyHandler.integration.test.ts`
- Modify: `src/application/commands/project/RecoverProjectField/RecoverProjectFieldHandler.integration.test.ts`

Both handlers use `ProjectAccessService.verifyByProjectId(clientId, projectId)` which throws `NotFoundError` when `clientId` doesn't own the project. Tests exist for success paths but not the denial path.

- [x] **Step 1: RenameApiKey — ownership denial test**

Open `RenameApiKeyHandler.integration.test.ts`.

Add import:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when clientId does not own the project', async () => {
  const { projectId } = await seedProject(container)

  await expect(
    handler.execute(
      new RenameApiKeyCommand('00000000-0000-0000-0000-000000000000', projectId, 'hacked'),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 2: RecoverProjectField — ownership denial test**

Open `RecoverProjectFieldHandler.integration.test.ts`. `NotFoundError` is already imported.

The field must be soft-deleted first — otherwise the handler throws `NotFoundError` for "field not deleted", which would make the test pass for the wrong reason.

Add at end of `describe` block:

```ts
it('throws NotFoundError when clientId does not own the project', async () => {
  const { clientId, projectId, fieldId } = await seedProjectWithField(container)

  await deleteField.execute(new DeleteProjectFieldCommand(fieldId, projectId, clientId, false))

  await expect(
    handler.execute(
      new RecoverProjectFieldCommand(projectId, fieldId, '00000000-0000-0000-0000-000000000000'),
    ),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 3: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: 2 new tests pass.

---

### Task 9: User field cross-project isolation ⚠ production code

**Files:**

- Modify: `src/application/commands/user/UpdateUserField/UpdateUserFieldHandler.ts`
- Modify: `src/application/queries/user/GetUserField/GetUserFieldHandler.ts`
- Modify: `src/application/queries/user/GetUserFields/GetUserFieldsHandler.ts`
- Modify: `src/application/commands/user/UpdateUserField/UpdateUserFieldHandler.integration.test.ts`
- Modify: `src/application/queries/user/GetUserField/GetUserFieldHandler.integration.test.ts`
- Modify: `src/application/queries/user/GetUserFields/GetUserFieldsHandler.integration.test.ts`

**Context:** All three handlers verify field ↔ project ownership but not user ↔ project ownership. If a `userId` from project A is paired with `projectId` B, handlers succeed silently — `UpdateUserField` creates a cross-project `userFieldValue` row; `GetUserField`/`GetUserFields` return project B's schema with null values (no error, data mismatch). HTTP layer is safe (JWT scopes userId to project), but handler is not self-protecting.

Fix pattern for all three: load user by `userId`, verify `user.projectId === command/query.projectId`, throw `NotFoundError` if mismatch. `User.projectId` is a public readonly field.

`GetUserFieldsHandler` already injects `UserRepository` (`this.users`). `UpdateUserFieldHandler` and `GetUserFieldHandler` do not — they need it added.

- [x] **Step 1: UpdateUserFieldHandler — inject UserRepository + add ownership check**

Open `UpdateUserFieldHandler.ts`.

Add import:

```ts
import { UserRepository } from '@aggregates/user/UserRepository'
```

Add to constructor:

```ts
@inject(UserRepository)
private readonly users: UserRepository,
```

In `execute`, after `const field = await this.projectFields.findByIdAndProject(...)` succeeds, add before the `schemaBuilder.build` call:

```ts
const user = await this.users.findById(command.userId)
if (!user || user.projectId !== command.projectId)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
    userId: command.userId,
    projectId: command.projectId,
  })
```

Add `NotFoundError` import if not present:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

- [x] **Step 2: GetUserFieldHandler — inject UserRepository + add ownership check**

Open `GetUserFieldHandler.ts`.

Add import:

```ts
import { UserRepository } from '@aggregates/user/UserRepository'
```

Add to constructor:

```ts
@inject(UserRepository)
private readonly users: UserRepository,
```

In `execute`, after `const field = await this.projectFields.findByIdAndProject(...)` succeeds, add before the `userField` lookup:

```ts
const user = await this.users.findById(query.userId)
if (!user || user.projectId !== query.projectId)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
    userId: query.userId,
    projectId: query.projectId,
  })
```

- [x] **Step 3: GetUserFieldsHandler — add ownership check (UserRepository already injected)**

Open `GetUserFieldsHandler.ts`. `this.users` is already available.

In `execute`, add before `this.fieldsService.getFieldsWithValues(...)`:

```ts
const user = await this.users.findById(query.userId)
if (!user || user.projectId !== query.projectId)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
    userId: query.userId,
    projectId: query.projectId,
  })
```

Add import:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

- [x] **Step 4: UpdateUserField — cross-project test**

Open `UpdateUserFieldHandler.integration.test.ts`.

Add imports:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
import { seedUser } from '../../../../tests/helpers/userSeed'
import { seedUserWithField } from '../../../../tests/helpers/userSeed'
```

(Note: `seedUserWithField` creates a second client+project+user+field — use its `projectId` and `fieldId` as the "other project".)

Add at end of `describe` block:

```ts
it('throws NotFoundError when userId does not belong to the project', async () => {
  const { userId } = await seedUser(container)
  const { projectId: otherProjectId, fieldId: otherFieldId } = await seedUserWithField(container)

  await expect(
    handler.execute(new UpdateUserFieldCommand(userId, otherProjectId, otherFieldId, 'value')),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 5: GetUserField — cross-project test**

Open `GetUserFieldHandler.integration.test.ts`.

Add import:

```ts
import { seedUser } from '../../../../tests/helpers/userSeed'
```

(`NotFoundError` is already imported.)

Add at end of `describe` block:

```ts
it('throws NotFoundError when userId does not belong to the project', async () => {
  const { userId } = await seedUser(container)
  const { projectId: otherProjectId, fieldId: otherFieldId } = await seedUserWithField(container)

  await expect(
    handler.execute(new GetUserFieldQuery(userId, otherProjectId, otherFieldId)),
  ).rejects.toThrow(NotFoundError)
})
```

- [x] **Step 6: GetUserFields — cross-project test**

Open `GetUserFieldsHandler.integration.test.ts`.

`seedUser` is already imported. Add:

```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when userId does not belong to the project', async () => {
  const { userId } = await seedUser(container)
  const { projectId: otherProjectId } = await seedUserWithField(container)

  await expect(handler.execute(new GetUserFieldsQuery(userId, otherProjectId))).rejects.toThrow(
    NotFoundError,
  )
})
```

- [x] **Step 7: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: 3 new tests pass, all existing pass.

---

### Task 10: Nit — userSeed field name alignment

**File:** `src/tests/helpers/userSeed.ts`

- [x] **Step 1: Align field name with projectSeed constant**

Open `src/tests/helpers/userSeed.ts`. On the `AddProjectFieldCommand` call (L50-59), the field name is hardcoded as `'bio'`. In `projectSeed.ts`, the field name constant is `PROJECT_SEED.field.name = 'biography'`.

These are different seeds so the names don't need to match, but tests in `GetUserFieldHandler` and `GetUserFieldsHandler` assert `expect(result.field.name).toBe('bio')` — this is testing the seed constant, not the handler. Either:

Option A — add a constant to `userSeed.ts`:

```ts
export const SEED = {
  // ... existing
  field: { name: 'bio' },
}
```

Then change the test assertions to use `SEED.field.name` instead of the hardcoded string `'bio'`.

Option B — rename to `'biography'` everywhere and import `PROJECT_SEED.field.name` from projectSeed.

**Recommendation:** Option A — add `SEED.field` constant, update test assertions in `GetUserFieldHandler.integration.test.ts:27` and `GetUserFieldsHandler.integration.test.ts:35`.

- [x] **Step 2: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all tests pass.
