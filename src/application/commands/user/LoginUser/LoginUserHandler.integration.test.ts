import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { LoginUserHandler } from './LoginUserHandler'
import { LoginUserCommand } from './LoginUserCommand'
import { RefreshUserAccessTokenHandler } from '../RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from '../RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED, type UserSeedResult } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const loginHandler = container.get(LoginUserHandler)
const refreshHandler = container.get(RefreshUserAccessTokenHandler)

describe('LoginUserHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns accessToken, refreshToken and userId on valid credentials', async () => {
    const { projectId } = await seedUser(container)

    const result = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )

    expect(result.userId).toBeTruthy()
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('refresh token from login is usable', async () => {
    const { projectId } = await seedUser(container)

    const { refreshToken } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(refreshToken)),
    ).resolves.toBeTruthy()
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { projectId } = await seedUser(container)

    await expect(
      loginHandler.execute(
        new LoginUserCommand('wrongpassword', SEED.user.email, projectId, null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for non-existent user', async () => {
    const { projectId } = await seedUser(container)

    await expect(
      loginHandler.execute(
        new LoginUserCommand(SEED.user.password, 'nobody@example.com', projectId, null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for valid user in wrong project', async () => {
    const seed: UserSeedResult = await seedUser(container)

    await expect(
      loginHandler.execute(
        new LoginUserCommand(SEED.user.password, SEED.user.email, '00000000-0000-0000-0000-000000000000', null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)

    void seed
  })
})
