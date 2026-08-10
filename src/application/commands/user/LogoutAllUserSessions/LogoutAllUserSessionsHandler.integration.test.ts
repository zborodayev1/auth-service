import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { LogoutAllUserSessionsHandler } from './LogoutAllUserSessionsHandler'
import { LogoutAllUserSessionsCommand } from './LogoutAllUserSessionsCommand'
import { RefreshUserAccessTokenHandler } from '../RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from '../RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(LogoutAllUserSessionsHandler)
const loginHandler = container.get(LoginUserHandler)
const refreshHandler = container.get(RefreshUserAccessTokenHandler)

describe('LogoutAllUserSessionsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns success', async () => {
    const { userId } = await seedUser(container)

    const result = await handler.execute(new LogoutAllUserSessionsCommand(userId))

    expect(result.success).toBe(true)
  })

  it('invalidates all sessions — refresh fails for all tokens', async () => {
    const { userId, projectId, refreshToken: token1 } = await seedUser(container)

    const { refreshToken: token2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )

    await handler.execute(new LogoutAllUserSessionsCommand(userId))

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(token1)),
    ).rejects.toThrow(UnauthorizedError)

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(token2)),
    ).rejects.toThrow(UnauthorizedError)
  })
})
