import { describe, expect } from 'vitest'
import { UserAuthService } from './UserAuthService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { seedUser } from '@tests/fixtures/user'
import { environment } from '@tests/setup'
import { seedProject } from '@tests/fixtures/project'
import { seedClient } from '@tests/fixtures/client'
import { AUTH_ERROR_CODES, NOT_FOUND_ERROR_CODES } from '@shared/errors/ErrorCodes'
import { integrationTest } from '@tests/helpers/integrationTest'
import { getDbClient } from '@tests/helpers/getDbClient'
import { NotFoundError } from '@shared/errors/NotFoundError'

const container = environment.container.container
const service = container.get(UserAuthService)

const VALID_CLIENT = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

describe('UserAuthService', () => {
  describe('login()', () => {
    integrationTest('returns accessToken and refreshToken', async () => {
      const { clientId } = await seedClient(container, VALID_CLIENT)
      const { projectId } = await seedProject(container, clientId)
      const { userId } = await seedUser(container, projectId)

      const result = await service.login({
        userId,
        projectId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    integrationTest('throws PROJECT_NOT_FOUND for non-existent project', async () => {
      const { clientId } = await seedClient(container, VALID_CLIENT)
      const { projectId } = await seedProject(container, clientId)
      const { userId } = await seedUser(container, projectId)

      const err = await service
        .login({
          userId,
          projectId: '00000000-0000-0000-0000-000000000000',
          userAgent: null,
          ipAddress: null,
          deviceName: null,
        })
        .catch((e: unknown) => e)

      expect(err).toBeInstanceOf(NotFoundError)
      expect((err as NotFoundError).code).toBe(NOT_FOUND_ERROR_CODES.RESOURCE_NOT_FOUND)
    })

    integrationTest('does not create session when project does not exist', async () => {
      const { clientId } = await seedClient(container, VALID_CLIENT)
      const { projectId } = await seedProject(container, clientId)
      const { userId } = await seedUser(container, projectId)

      const db = getDbClient(container)

      const sessionsBefore = await db.userSession.count()
      const tokensBefore = await db.userRefreshToken.count()

      await expect(
        service.login({
          userId,
          projectId: '00000000-0000-0000-0000-000000000000',
          userAgent: null,
          ipAddress: null,
          deviceName: null,
        }),
      ).rejects.toThrow(NotFoundError)

      expect(await db.userSession.count()).toBe(sessionsBefore)
      expect(await db.userRefreshToken.count()).toBe(tokensBefore)
    })
  })

  describe('refresh()', () => {
    integrationTest('returns new accessToken and refreshToken', async () => {
      const { clientId } = await seedClient(container, VALID_CLIENT)
      const { projectId } = await seedProject(container, clientId)
      const { userId } = await seedUser(container, projectId)

      const { refreshToken } = await service.login({
        userId,
        projectId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })

      const result = await service.refresh(refreshToken)
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    integrationTest('throws REFRESH_TOKEN_REUSE_DETECTED on second use of same token', async () => {
      const { clientId } = await seedClient(container, VALID_CLIENT)
      const { projectId } = await seedProject(container, clientId)
      const { refreshToken } = await seedUser(container, projectId)

      await service.refresh(refreshToken)
      const err = await service.refresh(refreshToken).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).code).toBe(AUTH_ERROR_CODES.TOKEN_REUSED)
    })

    integrationTest('throws REFRESH_TOKEN_EXPIRED for expired token', async () => {
      const { clientId } = await seedClient(container, VALID_CLIENT)
      const { projectId } = await seedProject(container, clientId)
      const { refreshToken } = await seedUser(container, projectId)

      await getDbClient(container).userRefreshToken.updateMany({
        where: {},
        data: { expiresAt: new Date(0) },
      })

      const err = await service.refresh(refreshToken).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).code).toBe(AUTH_ERROR_CODES.TOKEN_EXPIRED)
    })

    integrationTest('throws REFRESH_TOKEN_INVALID for unknown token', async () => {
      const err = await service.refresh('not-a-real-token').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).code).toBe(AUTH_ERROR_CODES.UNAUTHENTICATED)
    })
  })
})
