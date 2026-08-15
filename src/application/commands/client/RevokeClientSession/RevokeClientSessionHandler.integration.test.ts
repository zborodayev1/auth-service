import { beforeEach, describe, expect, it } from 'vitest'
import { RevokeClientSessionHandler } from './RevokeClientSessionHandler'
import { RevokeClientSessionCommand } from './RevokeClientSessionCommand'
import { type RegisterClientResult, RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { LoginClientHandler } from '../LoginClient/LoginClientHandler'
import { LoginClientCommand } from '../LoginClient/LoginClientCommand'
import { RefreshClientAccessTokenHandler } from '../RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from '../RefreshClientAccessToken/RefreshClientAccessTokenCommand'
import type { ClientAccessTokenService as IClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ValidationError } from '@shared/errors/ValidationError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'

const container = getTestContainer()
const handler = container.get(RevokeClientSessionHandler)
const registerHandler = container.get(RegisterClientHandler)
const loginHandler = container.get(LoginClientHandler)
const refreshHandler = container.get(RefreshClientAccessTokenHandler)
const accessTokenService = container.get<IClientAccessTokenService>(ClientAccessTokenService)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

const login = (): ReturnType<typeof loginHandler.execute> =>
  loginHandler.execute(new LoginClientCommand(VALID.password, VALID.email, null, null, null))

describe('RevokeClientSessionHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('revokes target session successfully', async () => {
    const { accessToken: at1, clientId } = await seed()
    const { accessToken: at2 } = await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)
    const { sessionId: sessionId2 } = accessTokenService.verify(at2)

    const result = await handler.execute(
      new RevokeClientSessionCommand(sessionId2, clientId, sessionId1),
    )

    expect(result.success).toBe(true)
  })

  it('refresh token is no longer usable after revoke', async () => {
    const { accessToken: at1, clientId } = await seed()
    const { accessToken: at2, refreshToken: rt2 } = await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)
    const { sessionId: sessionId2 } = accessTokenService.verify(at2)

    await handler.execute(new RevokeClientSessionCommand(sessionId2, clientId, sessionId1))

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(rt2)),
    ).rejects.toThrow()
  })

  it('other sessions are not affected', async () => {
    const { accessToken: at1, refreshToken: rt1, clientId } = await seed()
    const { accessToken: at2 } = await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)
    const { sessionId: sessionId2 } = accessTokenService.verify(at2)

    await handler.execute(new RevokeClientSessionCommand(sessionId2, clientId, sessionId1))

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(rt1)),
    ).resolves.toBeTruthy()
  })

  it('throws ValidationError when trying to revoke current session', async () => {
    const { accessToken, clientId } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    await expect(
      handler.execute(new RevokeClientSessionCommand(sessionId, clientId, sessionId)),
    ).rejects.toThrow(ValidationError)
  })

  it('throws NotFoundError for non-existent session id', async () => {
    const { accessToken, clientId } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    await expect(
      handler.execute(
        new RevokeClientSessionCommand(
          '00000000-0000-0000-0000-000000000000',
          clientId,
          sessionId,
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when clientId does not own the session', async () => {
    const { accessToken: at1 } = await seed()
    const { accessToken: at2 } = await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)
    const { sessionId: sessionId2 } = accessTokenService.verify(at2)

    await expect(
      handler.execute(
        new RevokeClientSessionCommand(
          sessionId2,
          '00000000-0000-0000-0000-000000000000',
          sessionId1,
        ),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
