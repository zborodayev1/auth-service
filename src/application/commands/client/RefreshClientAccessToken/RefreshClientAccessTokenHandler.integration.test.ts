import { beforeEach, describe, expect, it } from 'vitest'
import { RefreshClientAccessTokenHandler } from './RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from './RefreshClientAccessTokenCommand'
import type { RegisterClientResult } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'

const container = getTestContainer()
const refreshHandler = container.get(RefreshClientAccessTokenHandler)
const registerHandler = container.get(RegisterClientHandler)
const prisma = container.get(PrismaProvider)

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

  it('new token from rotation is usable', async () => {
    const { refreshToken } = await seed()

    const { refreshToken: newToken } = await refreshHandler.execute(
      new RefreshClientAccessTokenCommand(refreshToken),
    )

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(newToken)),
    ).resolves.toBeTruthy()
  })

  it('chained rotation: token2 works, then fails after token3 issued', async () => {
    const { refreshToken: token1 } = await seed()

    const { refreshToken: token2 } = await refreshHandler.execute(
      new RefreshClientAccessTokenCommand(token1),
    )
    const { refreshToken: token3 } = await refreshHandler.execute(
      new RefreshClientAccessTokenCommand(token2),
    )

    expect(token3).toBeTruthy()
    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(token1)),
    ).rejects.toThrow(UnauthorizedError)
    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(token2)),
    ).rejects.toThrow(UnauthorizedError)
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

  it('throws UnauthorizedError for expired refresh token', async () => {
    const { refreshToken } = await seed()

    await prisma.refreshToken.updateMany({ where: {}, data: { expiresAt: new Date(0) } })

    await expect(
      refreshHandler.execute(new RefreshClientAccessTokenCommand(refreshToken)),
    ).rejects.toThrow(UnauthorizedError)
  })
})
