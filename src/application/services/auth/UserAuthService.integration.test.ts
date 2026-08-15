import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { UserAuthService } from './UserAuthService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { getTestContainer, disconnectTestDb } from '../../../tests/helpers/container'
import { truncateAll } from '../../../tests/helpers/db'
import { seedUser } from '../../../tests/helpers/userSeed'

const container = getTestContainer()
const service = container.get(UserAuthService)
const prisma = container.get(PrismaProvider)

describe('UserAuthService', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  describe('login()', () => {
    it('returns accessToken and refreshToken', async () => {
      const { userId, projectId } = await seedUser(container)
      const result = await service.login({ userId, projectId, userAgent: null, ipAddress: null, deviceName: null })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    it('throws PROJECT_NOT_FOUND for non-existent project', async () => {
      const { userId } = await seedUser(container)
      const err = await service
        .login({ userId, projectId: '00000000-0000-0000-0000-000000000000', userAgent: null, ipAddress: null, deviceName: null })
        .catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('PROJECT_NOT_FOUND')
    })
  })

  describe('refresh()', () => {
    it('returns new accessToken and refreshToken', async () => {
      const { userId, projectId } = await seedUser(container)
      const { refreshToken } = await service.login({ userId, projectId, userAgent: null, ipAddress: null, deviceName: null })
      const result = await service.refresh(refreshToken)
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    it('throws REFRESH_TOKEN_REUSE_DETECTED on second use of same token', async () => {
      const { refreshToken } = await seedUser(container)
      await service.refresh(refreshToken)
      const err = await service.refresh(refreshToken).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_REUSE_DETECTED')
    })

    it('throws REFRESH_TOKEN_EXPIRED for expired token', async () => {
      const { refreshToken } = await seedUser(container)
      await prisma.userRefreshToken.updateMany({ where: {}, data: { expiresAt: new Date(0) } })
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
