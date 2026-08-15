import { describe, expect, it } from 'vitest'
import { LogoutCurrentClientSessionHandler } from './LogoutCurrentClientSessionHandler'
import { LogoutCurrentClientSessionCommand } from './LogoutCurrentClientSessionCommand'
import { RefreshClientAccessTokenHandler } from '../RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from '../RefreshClientAccessToken/RefreshClientAccessTokenCommand'
import type { RegisterClientResult } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import type { ClientAccessTokenService as IClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { LoginClientHandler } from '../LoginClient/LoginClientHandler'
import { LoginClientCommand } from '../LoginClient/LoginClientCommand'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'

const container = getTestContainer()
const handler = container.get(LogoutCurrentClientSessionHandler)
const registerHandler = container.get(RegisterClientHandler)
const refreshHandler = container.get(RefreshClientAccessTokenHandler)
const loginHandler = container.get(LoginClientHandler)
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

describe('LogoutCurrentClientSessionHandler', () => {
  useTransactionIsolation(container)

  it('revokes session successfully', async () => {
    const { accessToken, clientId } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    const result = await handler.execute(new LogoutCurrentClientSessionCommand(sessionId, clientId))

    expect(result.success).toBe(true)
  })

  it('refresh fails after logout', async () => {
    const { accessToken, refreshToken, clientId } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    await handler.execute(new LogoutCurrentClientSessionCommand(sessionId, clientId))

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken)),
    ).rejects.toThrow(UnauthorizedError)
  })

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

  it('throws UnauthorizedError for already revoked session', async () => {
    const { accessToken, clientId } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    await handler.execute(new LogoutCurrentClientSessionCommand(sessionId, clientId))

    await expect(
      handler.execute(new LogoutCurrentClientSessionCommand(sessionId, clientId)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when clientId does not own the session', async () => {
    const { accessToken } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    await expect(
      handler.execute(
        new LogoutCurrentClientSessionCommand(sessionId, '00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })
})
