import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { RefreshClientAccessTokenHandler } from './RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from './RefreshClientAccessTokenCommand'
import type { RegisterClientResult } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'

const container = getTestContainer()
const refreshHandler = container.get(RefreshClientAccessTokenHandler)
const registerHandler = container.get(RegisterClientHandler)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

describe('RefreshClientAccessTokenHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns new accessToken and refreshToken', async () => {
    const { refreshToken } = await seed()

    const result = await refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken))

    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('returns a different refreshToken after rotation', async () => {
    const { refreshToken } = await seed()

    const result = await refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken))

    expect(result.refreshToken).not.toBe(refreshToken)
  })

  it('throws UnauthorizedError on reuse of rotated token', async () => {
    const { refreshToken } = await seed()

    await refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken))

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for invalid token', async () => {
    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand('invalid-token')),
    ).rejects.toThrow(UnauthorizedError)
  })
})
