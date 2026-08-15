import { beforeEach, describe, expect, it } from 'vitest'
import { LogoutUserSessionHandler } from './LogoutUserSessionHandler'
import { LogoutUserSessionCommand } from './LogoutUserSessionCommand'
import { RefreshUserAccessTokenHandler } from '../RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from '../RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import jwt from 'jsonwebtoken'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedUser } from '@tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(LogoutUserSessionHandler)
const refreshHandler = container.get(RefreshUserAccessTokenHandler)

const getSessionId = (accessToken: string): string =>
  (jwt.decode(accessToken) as { sid: string }).sid

describe('LogoutUserSessionHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('revokes session successfully', async () => {
    const { accessToken, userId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    const result = await handler.execute(new LogoutUserSessionCommand(sessionId, userId))

    expect(result.success).toBe(true)
  })

  it('refresh fails after logout', async () => {
    const { accessToken, refreshToken, userId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    await handler.execute(new LogoutUserSessionCommand(sessionId, userId))

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(refreshToken)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for already revoked session', async () => {
    const { accessToken, userId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    await handler.execute(new LogoutUserSessionCommand(sessionId, userId))

    await expect(handler.execute(new LogoutUserSessionCommand(sessionId, userId))).rejects.toThrow(
      UnauthorizedError,
    )
  })

  it('throws UnauthorizedError when userId does not own the session', async () => {
    const { accessToken } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    await expect(
      handler.execute(
        new LogoutUserSessionCommand(sessionId, '00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })
})
