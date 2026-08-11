import { beforeEach, describe, expect, it } from 'vitest'
import { LogoutAllClientSessionsHandler } from './LogoutAllClientSessionsHandler'
import { LogoutAllClientSessionsCommand } from './LogoutAllClientSessionsCommand'
import { RefreshClientAccessTokenHandler } from '../RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from '../RefreshClientAccessToken/RefreshClientAccessTokenCommand'
import {
  type RegisterClientResult,
  RegisterClientHandler,
} from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { LoginClientHandler } from '../LoginClient/LoginClientHandler'
import { LoginClientCommand } from '../LoginClient/LoginClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'

const container = getTestContainer()
const handler = container.get(LogoutAllClientSessionsHandler)
const registerHandler = container.get(RegisterClientHandler)
const loginHandler = container.get(LoginClientHandler)
const refreshHandler = container.get(RefreshClientAccessTokenHandler)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

describe('LogoutAllClientSessionsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns success', async () => {
    const { clientId } = await seed()

    const result = await handler.execute(new LogoutAllClientSessionsCommand(clientId))

    expect(result.success).toBe(true)
  })

  it('does not invalidate sessions of other clients', async () => {
    const { clientId: clientIdA, refreshToken: tokenA } = await seed()
    const { refreshToken: tokenB } = await registerHandler.execute(
      new RegisterClientCommand('Other Client', 'other@example.com', VALID.password, null, null, null),
    )

    await handler.execute(new LogoutAllClientSessionsCommand(clientIdA))

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(tokenA)),
    ).rejects.toThrow(UnauthorizedError)

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(tokenB)),
    ).resolves.toBeTruthy()
  })

  it('invalidates all sessions — refresh fails for all tokens', async () => {
    const { clientId, refreshToken: token1 } = await seed()
    const { refreshToken: token2 } = await loginHandler.execute(
      new LoginClientCommand(VALID.password, VALID.email, null, null, null),
    )

    await handler.execute(new LogoutAllClientSessionsCommand(clientId))

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(token1)),
    ).rejects.toThrow(UnauthorizedError)

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(token2)),
    ).rejects.toThrow(UnauthorizedError)
  })
})
