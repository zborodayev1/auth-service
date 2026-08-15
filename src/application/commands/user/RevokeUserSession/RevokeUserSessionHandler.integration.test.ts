import { describe, expect, it } from 'vitest'
import { RevokeUserSessionHandler } from './RevokeUserSessionHandler'
import { RevokeUserSessionCommand } from './RevokeUserSessionCommand'
import { LoginUserHandler } from '../LoginUser/LoginUserHandler'
import { LoginUserCommand } from '../LoginUser/LoginUserCommand'
import { RefreshUserAccessTokenHandler } from '../RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from '../RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ValidationError } from '@shared/errors/ValidationError'
import jwt from 'jsonwebtoken'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { seedUser, SEED } from '@tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(RevokeUserSessionHandler)
const loginHandler = container.get(LoginUserHandler)
const refreshHandler = container.get(RefreshUserAccessTokenHandler)

const getSessionId = (accessToken: string): string =>
  (jwt.decode(accessToken) as { sid: string }).sid

describe('RevokeUserSessionHandler', () => {
  useTransactionIsolation(container)

  it('revokes target session successfully', async () => {
    const { accessToken: at1, userId, projectId } = await seedUser(container)
    const { accessToken: at2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)
    const sessionId2 = getSessionId(at2)

    const result = await handler.execute(
      new RevokeUserSessionCommand(sessionId2, userId, sessionId1),
    )

    expect(result.success).toBe(true)
  })

  it('refresh token is no longer usable after revoke', async () => {
    const { accessToken: at1, userId, projectId } = await seedUser(container)
    const { accessToken: at2, refreshToken: rt2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)
    const sessionId2 = getSessionId(at2)

    await handler.execute(new RevokeUserSessionCommand(sessionId2, userId, sessionId1))

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(rt2)),
    ).rejects.toThrow()
  })

  it('other sessions are not affected', async () => {
    const { accessToken: at1, refreshToken: rt1, userId, projectId } = await seedUser(container)
    const { accessToken: at2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)
    const sessionId2 = getSessionId(at2)

    await handler.execute(new RevokeUserSessionCommand(sessionId2, userId, sessionId1))

    await expect(
      refreshHandler.execute(new RefreshUserAccessTokenCommand(rt1)),
    ).resolves.toBeTruthy()
  })

  it('throws ValidationError when trying to revoke current session', async () => {
    const { accessToken, userId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    await expect(
      handler.execute(new RevokeUserSessionCommand(sessionId, userId, sessionId)),
    ).rejects.toThrow(ValidationError)
  })

  it('throws NotFoundError for non-existent session id', async () => {
    const { accessToken, userId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    await expect(
      handler.execute(
        new RevokeUserSessionCommand('00000000-0000-0000-0000-000000000000', userId, sessionId),
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when userId does not own the session', async () => {
    const { accessToken: at1, projectId } = await seedUser(container)
    const { accessToken: at2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)
    const sessionId2 = getSessionId(at2)

    await expect(
      handler.execute(
        new RevokeUserSessionCommand(sessionId2, '00000000-0000-0000-0000-000000000000', sessionId1),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
