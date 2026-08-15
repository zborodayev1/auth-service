import { beforeEach, describe, expect, it } from 'vitest'
import { RefreshUserAccessTokenHandler } from './RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from './RefreshUserAccessTokenCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'
import { seedUser } from '@tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(RefreshUserAccessTokenHandler)
const prisma = container.get(PrismaProvider)

describe('RefreshUserAccessTokenHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('returns new accessToken and refreshToken', async () => {
    const { refreshToken } = await seedUser(container)

    const result = await handler.execute(new RefreshUserAccessTokenCommand(refreshToken))

    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('returns different refreshToken after rotation', async () => {
    const { refreshToken } = await seedUser(container)

    const result = await handler.execute(new RefreshUserAccessTokenCommand(refreshToken))

    expect(result.refreshToken).not.toBe(refreshToken)
  })

  it('throws UnauthorizedError on reuse of rotated token', async () => {
    const { refreshToken } = await seedUser(container)

    await handler.execute(new RefreshUserAccessTokenCommand(refreshToken))

    await expect(handler.execute(new RefreshUserAccessTokenCommand(refreshToken))).rejects.toThrow(
      UnauthorizedError,
    )
  })

  it('throws UnauthorizedError for invalid token', async () => {
    await expect(
      handler.execute(new RefreshUserAccessTokenCommand('invalid-token')),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for expired refresh token', async () => {
    const { refreshToken } = await seedUser(container)

    await prisma.userRefreshToken.updateMany({ where: {}, data: { expiresAt: new Date(0) } })

    await expect(handler.execute(new RefreshUserAccessTokenCommand(refreshToken))).rejects.toThrow(
      UnauthorizedError,
    )
  })
})
