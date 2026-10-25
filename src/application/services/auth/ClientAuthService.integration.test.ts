import { describe, expect } from 'vitest'
import { ClientAuthService } from './ClientAuthService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getDbClient } from '@tests/helpers/getDbClient'
import { environment } from '@tests/setup'
import { integrationTest } from '@tests/helpers/integrationTest'
import { seedClient } from '@tests/fixtures/client'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

const container = environment.container.container
const service = container.get(ClientAuthService)

describe('ClientAuthService', () => {
  describe('login()', () => {
    integrationTest('returns accessToken and refreshToken', async () => {
      const { clientId } = await seedClient(container)
      const result = await service.login({
        clientId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    integrationTest('multiple logins succeed independently', async () => {
      const { clientId } = await seedClient(container)
      const first = await service.login({
        clientId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })
      const second = await service.login({
        clientId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })
      expect(first.refreshToken).not.toBe(second.refreshToken)
    })

    integrationTest('login refresh token can be used to refresh tokens', async () => {
      const { clientId } = await seedClient(container)

      const loginResult = await service.login({
        clientId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })

      const refreshResult = await service.refresh(loginResult.refreshToken)

      expect(refreshResult.accessToken).toBeTruthy()
      expect(refreshResult.refreshToken).toBeTruthy()
      expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken)
    })

    integrationTest('multiple logins create independently usable sessions', async () => {
      const { clientId } = await seedClient(container)

      const first = await service.login({
        clientId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })

      const second = await service.login({
        clientId,
        userAgent: null,
        ipAddress: null,
        deviceName: null,
      })

      const firstRefresh = await service.refresh(first.refreshToken)
      const secondRefresh = await service.refresh(second.refreshToken)

      expect(firstRefresh.refreshToken).not.toBe(secondRefresh.refreshToken)
      expect(firstRefresh.accessToken).toBeTruthy()
      expect(secondRefresh.accessToken).toBeTruthy()
    })
  })

  describe('refresh()', () => {
    integrationTest('returns new accessToken and refreshToken', async () => {
      const { refreshToken } = await seedClient(container)
      const result = await service.refresh(refreshToken)

      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
    })

    integrationTest('rotated token differs from original', async () => {
      const { refreshToken } = await seedClient(container)
      const result = await service.refresh(refreshToken)

      expect(result.refreshToken).not.toBe(refreshToken)
    })

    integrationTest('throws REFRESH_TOKEN_REUSE_DETECTED on second use of same token', async () => {
      const { refreshToken } = await seedClient(container)
      await service.refresh(refreshToken)

      const err = await service.refresh(refreshToken).catch((e: unknown) => e)

      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).code).toBe(AUTH_ERROR_CODES.TOKEN_REUSED)
    })

    integrationTest('throws REFRESH_TOKEN_EXPIRED for expired token', async () => {
      const { refreshToken } = await seedClient(container)

      await getDbClient(container).refreshToken.updateMany({
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
