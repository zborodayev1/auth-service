import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ClientAuthService } from './ClientAuthService'
import { RegisterClientHandler } from '../../commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../commands/client/RegisterClient/RegisterClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { getTestContainer, disconnectTestDb } from '../../../tests/helpers/container'
import { truncateAll } from '../../../tests/helpers/db'

const container = getTestContainer()
const service = container.get(ClientAuthService)
const registerHandler = container.get(RegisterClientHandler)
const prisma = container.get(PrismaProvider)

const CLIENT = { name: 'Test Client', email: 'client@example.com', password: 'password123' }

const seedClient = (): ReturnType<typeof registerHandler.execute> =>
  registerHandler.execute(
    new RegisterClientCommand(CLIENT.name, CLIENT.email, CLIENT.password, null, null, null),
  )

describe('ClientAuthService', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  describe('login()', () => {
    it('returns accessToken and refreshToken', async () => {
      const { clientId } = await seedClient()
      const result = await service.login({ clientId, userAgent: null, ipAddress: null, deviceName: null })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    it('multiple logins succeed independently', async () => {
      const { clientId } = await seedClient()
      const first = await service.login({ clientId, userAgent: null, ipAddress: null, deviceName: null })
      const second = await service.login({ clientId, userAgent: null, ipAddress: null, deviceName: null })
      expect(first.refreshToken).not.toBe(second.refreshToken)
    })
  })

  describe('refresh()', () => {
    it('returns new accessToken and refreshToken', async () => {
      const { refreshToken } = await seedClient()
      const result = await service.refresh(refreshToken)
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    it('rotated token differs from original', async () => {
      const { refreshToken } = await seedClient()
      const result = await service.refresh(refreshToken)
      expect(result.refreshToken).not.toBe(refreshToken)
    })

    it('throws REFRESH_TOKEN_REUSE_DETECTED on second use of same token', async () => {
      const { refreshToken } = await seedClient()
      await service.refresh(refreshToken)
      const err = await service.refresh(refreshToken).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_REUSE_DETECTED')
    })

    it('throws REFRESH_TOKEN_EXPIRED for expired token', async () => {
      const { refreshToken } = await seedClient()
      await prisma.refreshToken.updateMany({ where: {}, data: { expiresAt: new Date(0) } })
      const err = await service.refresh(refreshToken).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_EXPIRED')
    })

    it('throws REFRESH_TOKEN_INVALID for unknown token', async () => {
      const err = await service.refresh('not-a-real-token').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_INVALID')
    })
  })
})
