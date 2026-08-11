---
title: Phase 0.25 — Test Review Fixes 2
date: 2026-08-12
status: done
priority: medium — production logic bug + handler ownership gaps
---

# Phase 0.25 — Test Review Fixes 2

**Goal:** Fix issues found in second pass of the integration test suite review: one production logic bug (UpdateProjectField duplicate names), two handler ownership gaps (LogoutUserSession, LogoutAllUserSessions) with corresponding command and test updates, and one error message nit.

**Architecture:** Tasks 1-3 touch production handler + command files. Task 4 is test/nit only.

**Tech Stack:** Vitest, TypeScript, Prisma, InversifyJS DI container.

## Global Constraints

- No mocking repositories or handlers — real DB only.
- All test files use `getTestContainer()` from `src/tests/helpers/container.ts`.
- `truncateAll(container)` runs in `beforeEach`.
- Run integration tests: `pnpm vitest run --config vitest.integration.config.ts`
- Nil UUID constant for "unknown actor": `'00000000-0000-0000-0000-000000000000'`
- Path aliases: `@shared/`, `@aggregates/`, `@valueObjects/`, `@infra/`, `@config/`, `@ports/`, `@generated/`

---

### Task 1: UpdateProjectField — duplicate field name check ⚠ production code

**Files:**
- Modify: `src/application/commands/project/UpdateProjectField/UpdateProjectFieldHandler.ts`
- Modify: `src/application/commands/project/UpdateProjectField/UpdateProjectFieldHandler.integration.test.ts`

**Context:** `AddProjectFieldHandler` checks for duplicate names via `findByProjectAndName` + `ConflictError`. `UpdateProjectFieldHandler` has no such check — renaming a field to an existing name silently creates a duplicate in the project schema. The fix mirrors `AddProjectFieldHandler` exactly.

Command signature: `UpdateProjectFieldCommand(projectId, clientId, fieldId, name, required, defaultValue, enumValues)`

- [x] **Step 1: Add ConflictError import and duplicate name check**

Open `UpdateProjectFieldHandler.ts`.

Add import:
```ts
import { ConflictError } from '@shared/errors/ConflictError'
```

After `findByIdAndProject` succeeds (field found), add before `field.update(...)`:

```ts
const duplicate = await this.projectFields.findByProjectAndName(command.projectId, command.name)
if (duplicate && duplicate.id !== command.fieldId)
  throw new ConflictError('Project field already exists', 'FIELD_ALREADY_EXISTS', {
    command: command,
    field: duplicate,
  })
```

Note the `duplicate.id !== command.fieldId` guard — renaming a field to its own current name must be a no-op, not a conflict.

- [x] **Step 2: Add ConflictError test**

Open `UpdateProjectFieldHandler.integration.test.ts`.

Add imports:
```ts
import { ConflictError } from '@shared/errors/ConflictError'
import { AddProjectFieldHandler } from '../AddProjectField/AddProjectFieldHandler'
import { AddProjectFieldCommand } from '../AddProjectField/AddProjectFieldCommand'
```

Add module-level resolution:
```ts
const addField = container.get(AddProjectFieldHandler)
```

Add at end of `describe` block:

```ts
it('throws ConflictError when renaming to an existing field name', async () => {
  const { clientId, projectId, fieldId } = await seedProjectWithField(container)

  await addField.execute(
    new AddProjectFieldCommand(projectId, clientId, 'othername', 'string', false, null, []),
  )

  await expect(
    handler.execute(
      new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'othername', false, null, []),
    ),
  ).rejects.toThrow(ConflictError)
})

it('allows renaming a field to its own current name', async () => {
  const { clientId, projectId, fieldId } = await seedProjectWithField(container)

  await expect(
    handler.execute(
      new UpdateProjectFieldCommand(projectId, clientId, fieldId, 'biography', false, null, []),
    ),
  ).resolves.toBeTruthy()
})
```

Note: `PROJECT_SEED.field.name = 'biography'` — the self-rename test uses the seed name.

- [x] **Step 3: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all existing tests pass + 2 new ones.

---

### Task 2: LogoutUserSession — userId ownership check ⚠ production code

**Files:**
- Modify: `src/application/commands/user/LogoutUserSession/LogoutUserSessionCommand.ts`
- Modify: `src/application/commands/user/LogoutUserSession/LogoutUserSessionHandler.ts`
- Modify: `src/application/commands/user/LogoutUserSession/LogoutUserSessionHandler.integration.test.ts`

**Context:** `LogoutUserSessionCommand` only carries `sessionId`. The handler finds the session and checks `isActive()` but never verifies `session.userId === command.userId`. Exact same gap that existed in `LogoutCurrentClientSessionHandler` (fixed in Task 5 of phase-3.5.2). `UserSession` aggregate has a public readonly `userId: string` field.

- [x] **Step 1: Add userId to LogoutUserSessionCommand**

Open `LogoutUserSessionCommand.ts`. Replace:

```ts
export class LogoutUserSessionCommand {
  constructor(public readonly sessionId: string) {}
}
```

with:

```ts
export class LogoutUserSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
  ) {}
}
```

- [x] **Step 2: Add ownership check to handler**

Open `LogoutUserSessionHandler.ts`. After the `!session?.isActive()` guard, add:

```ts
if (session.userId !== command.userId) {
  throw new UnauthorizedError('Session does not belong to this user', 'SESSION_OWNERSHIP_VIOLATION', {
    sessionId: command.sessionId,
    commandUserId: command.userId,
  })
}
```

- [x] **Step 3: Update all existing test calls to pass userId**

Open `LogoutUserSessionHandler.integration.test.ts`.

All existing `new LogoutUserSessionCommand(sessionId)` calls must become `new LogoutUserSessionCommand(sessionId, userId)`.

`seedUser` returns `userId` — destructure it wherever needed.

Updated calls:
```ts
// 'revokes session successfully'
const { accessToken, userId } = await seedUser(container)
// ...
handler.execute(new LogoutUserSessionCommand(sessionId, userId))

// 'refresh fails after logout'
const { accessToken, refreshToken, userId } = await seedUser(container)
// ...
handler.execute(new LogoutUserSessionCommand(sessionId, userId))

// 'throws UnauthorizedError for already revoked session'
const { accessToken, userId } = await seedUser(container)
// ...
handler.execute(new LogoutUserSessionCommand(sessionId, userId))
// second call: handler.execute(new LogoutUserSessionCommand(sessionId, userId))
```

- [x] **Step 4: Add ownership test**

Add at end of `describe` block:

```ts
it('throws UnauthorizedError when userId does not own the session', async () => {
  const { accessToken } = await seedUser(container)
  const sessionId = getSessionId(accessToken)

  await expect(
    handler.execute(
      new LogoutUserSessionCommand(sessionId, '00000000-0000-0000-0000-000000000000'),
    ),
  ).rejects.toThrow(UnauthorizedError)
})
```

- [x] **Step 5: Fix any other callers of LogoutUserSessionCommand**

Search the codebase for other uses:
```bash
grep -rn "LogoutUserSessionCommand" src/
```

Update all found callers to pass the second `userId` argument.

- [x] **Step 6: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all existing tests pass + 1 new one.

---

### Task 3: LogoutAllUserSessions — projectId verification ⚠ production code

**Files:**
- Modify: `src/application/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsCommand.ts`
- Modify: `src/application/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler.ts`
- Modify: `src/application/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler.integration.test.ts`

**Context:** `LogoutAllUserSessionsCommand` only carries `userId`. Handler calls `revokeAllByUserId` without verifying the user belongs to the caller's project. Need to add `projectId` to command and verify `user.projectId === command.projectId` before revoking. `UserRepository` not yet injected in this handler — needs adding.

- [x] **Step 1: Add projectId to LogoutAllUserSessionsCommand**

Open `LogoutAllUserSessionsCommand.ts`. Replace:

```ts
export class LogoutAllUserSessionsCommand {
  constructor(public readonly userId: string) {}
}
```

with:

```ts
export class LogoutAllUserSessionsCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
  ) {}
}
```

- [x] **Step 2: Inject UserRepository and add ownership check**

Open `LogoutAllUserSessionsHandler.ts`.

Add imports:
```ts
import { UserRepository } from '@aggregates/user/UserRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
```

Add to constructor:
```ts
@inject(UserRepository)
private readonly users: UserRepository,
```

In `execute`, before `revokeAllByUserId`, add:

```ts
const user = await this.users.findById(command.userId)
if (!user || user.projectId !== command.projectId)
  throw new NotFoundError('User not found', 'USER_NOT_FOUND', {
    userId: command.userId,
    projectId: command.projectId,
  })
```

- [x] **Step 3: Update existing test calls to pass projectId**

Open `LogoutAllUserSessionsHandler.integration.test.ts`.

All existing `new LogoutAllUserSessionsCommand(userId)` calls must become `new LogoutAllUserSessionsCommand(userId, projectId)`.

`seedUser` returns `projectId` — destructure it. Updated calls:

```ts
// 'returns success'
const { userId, projectId } = await seedUser(container)
handler.execute(new LogoutAllUserSessionsCommand(userId, projectId))

// 'invalidates all sessions'
const { userId, projectId, refreshToken: token1 } = await seedUser(container)
// ...
handler.execute(new LogoutAllUserSessionsCommand(userId, projectId))
```

Remove the double-blank line before first `it` (nit — already present in file L22-23).

- [x] **Step 4: Add project isolation test**

Add imports if not present:
```ts
import { NotFoundError } from '@shared/errors/NotFoundError'
import { RegisterUserHandler } from '../RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '../RegisterUser/RegisterUserCommand'
import { CreateProjectHandler } from '../../project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '../../project/CreateProject/CreateProjectCommand'
```

Add module-level resolutions if not present:
```ts
const registerUser = container.get(RegisterUserHandler)
const createProject = container.get(CreateProjectHandler)
```

Add at end of `describe` block:

```ts
it('throws NotFoundError when userId does not belong to projectId', async () => {
  const { userId, clientId } = await seedUser(container)
  const { projectId: otherProjectId } = await createProject.execute(
    new CreateProjectCommand('Other Project', clientId),
  )

  await expect(
    handler.execute(new LogoutAllUserSessionsCommand(userId, otherProjectId)),
  ).rejects.toThrow(NotFoundError)
})

it('does not invalidate sessions of users in other projects', async () => {
  const { userId, projectId, clientId } = await seedUser(container)

  const { projectId: otherProjectId } = await createProject.execute(
    new CreateProjectCommand('Other Project', clientId),
  )
  const { refreshToken: otherToken } = await registerUser.execute(
    new RegisterUserCommand(otherProjectId, 'other@example.com', SEED.user.password, {}, null, null, null),
  )

  await handler.execute(new LogoutAllUserSessionsCommand(userId, projectId))

  await expect(
    refreshHandler.execute(new RefreshUserAccessTokenCommand(otherToken)),
  ).resolves.toBeTruthy()
})
```

- [x] **Step 5: Fix any other callers of LogoutAllUserSessionsCommand**

```bash
grep -rn "LogoutAllUserSessionsCommand" src/
```

Update all callers to pass `projectId` as second argument.

- [x] **Step 6: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all existing tests pass + 2 new ones.

---

### Task 4: GetUserFieldHandler — error message capitalization nit

**File:**
- Modify: `src/application/queries/user/GetUserField/GetUserFieldHandler.ts`

- [x] **Step 1: Fix title-case error message**

Open `GetUserFieldHandler.ts` L32. Replace:

```ts
if (!field) throw new NotFoundError('Field Not Found', 'FIELD_NOT_FOUND', { query: query })
```

with:

```ts
if (!field) throw new NotFoundError('Field not found', 'FIELD_NOT_FOUND', { query: query })
```

- [x] **Step 2: Run tests**

```bash
pnpm vitest run --config vitest.integration.config.ts
```

Expected: all tests pass.
