---
title: Phase 3.5.1 — Test Fixes & Coverage Gaps
date: 2026-08-11
status: done
priority: medium — one test currently gives false confidence (RotateApiKey), two structural risks under parallelism
---

# Phase 3.5.1 — Test Fixes & Coverage Gaps

Post-review of the phase-3.5 test suite. One assertion is semantically broken (always passes, never catches the bug it targets). Two structural risks exist if parallelism changes. Missing coverage on two security-critical paths.

---

## 3.5.1.0 — RotateApiKey test: wrong comparison (bug)

**File:** `src/application/commands/project/RotateApiKey/RotateApiKeyHandler.integration.test.ts:33`

**Problem:** `expect(rawKey).not.toBe(before.id)` compares the new plaintext key against the ApiKey's UUID row ID. These are always unequal regardless of rotation logic. A broken `RotateApiKeyHandler` that returns the old raw key would still pass this test.

**Fix:** Rotate twice and compare the two `rawKey` values:

```ts
it('new key differs from original', async () => {
  const { clientId, projectId } = await seedProject(container)

  const { rawKey: first } = await handler.execute(new RotateApiKeyCommand(clientId, projectId))
  const { rawKey: second } = await handler.execute(new RotateApiKeyCommand(clientId, projectId))

  expect(second).not.toBe(first)
})
```

---

## 3.5.1.1 — truncateAll: no transaction (risk)

**File:** `src/tests/helpers/db.ts:13-27`

**Problem:** Nine sequential `deleteMany` calls. If one fails mid-chain, DB is left partially truncated. Next `beforeEach` re-enters dirty state, producing confusing cascade failures.

**Fix:** Wrap in `prisma.$transaction`:

```ts
await prisma.$transaction([
  prisma.userFieldValue.deleteMany(),
  prisma.userRefreshToken.deleteMany(),
  prisma.userSession.deleteMany(),
  prisma.user.deleteMany(),
  prisma.apiKey.deleteMany(),
  prisma.projectField.deleteMany(),
  prisma.project.deleteMany(),
  prisma.refreshToken.deleteMany(),
  prisma.session.deleteMany(),
  prisma.client.deleteMany(),
])
```

---

## 3.5.1.2 — unused variable `seed` in LoginUserHandler test (nit)

**File:** `src/application/commands/user/LoginUser/LoginUserHandler.integration.test.ts:69`

**Problem:** `const seed: UserSeedResult = await seedUser(container)` — nothing from `seed` is used. `void seed` on L77 suppresses the lint error but is noise.

**Fix:** Drop the binding:

```ts
await seedUser(container)
```

---

## 3.5.1.3 — container singleton + disconnectTestDb (risk, documentation)

**File:** `src/tests/helpers/container.ts:30-35`

**Problem:** `disconnectTestDb` nulls the shared `_container` singleton. Works correctly under `fileParallelism: false` (sequential file execution, module cache shared across files in same worker). Any future change to parallelism will cause races — multiple files sharing and tearing down the same Prisma connection.

**Fix:** Add explicit comment tying the singleton to the parallelism constraint:

```ts
// Singleton is intentional: fileParallelism: false in vitest.integration.config.ts
// means files run sequentially in one worker — module cache is shared.
// disconnectTestDb() resets it so the next file gets a fresh connection.
// Do NOT enable fileParallelism without replacing this with a per-file factory.
```

---

## 3.5.1.4 — Missing coverage: cross-project isolation

**Problem:** No handler-level test asserts that operating on a resource owned by a different project/client is rejected. Ownership checks exist in code but are untested at the handler boundary.

**Priority targets:**
- `UpdateProjectUserFieldHandler` — call with clientId that does not own the project → expect `NotFoundError` or `UnauthorizedError`
- `DeleteProjectUserHandler` — same pattern
- `GetProjectUserHandler` — query user from wrong project

---

## 3.5.1.5 — Missing coverage: expired refreshToken in integration context

**Problem:** `RefreshClientAccessTokenHandler` and `RefreshUserAccessTokenHandler` tests only assert rejection of a reused or invalid token. No test seeds a token with a past `expiresAt` and verifies the handler rejects it at the DB-expiry check level.

**Fix:** After seeding, directly update the token's `expiresAt` via Prisma, then call the handler and assert `UnauthorizedError`.

```ts
it('throws UnauthorizedError for expired refresh token', async () => {
  const { refreshToken } = await seed()

  await prisma.refreshToken.updateMany({
    where: {},
    data: { expiresAt: new Date(0) },
  })

  await expect(
    refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken)),
  ).rejects.toThrow(UnauthorizedError)
})
```

---

## Out of Scope

- HTTP/controller layer tests — handler integration tests cover the logic
- 100% line coverage — focus on security-critical paths only
- Mocking repositories — real DB only (per phase-3.5 decision)
