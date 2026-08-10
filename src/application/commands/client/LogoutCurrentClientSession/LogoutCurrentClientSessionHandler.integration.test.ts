import { afterAll, beforeEach, describe, expect, it } from 'vitest'
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
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'

const container = getTestContainer()
const handler = container.get(LogoutCurrentClientSessionHandler)
const registerHandler = container.get(RegisterClientHandler)
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

describe('LogoutCurrentClientSessionHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

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

  it('throws UnauthorizedError for already revoked session', async () => {
    const { accessToken, clientId } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    await handler.execute(new LogoutCurrentClientSessionCommand(sessionId, clientId))

    await expect(
      handler.execute(new LogoutCurrentClientSessionCommand(sessionId, clientId)),
    ).rejects.toThrow(UnauthorizedError)
  })
})
