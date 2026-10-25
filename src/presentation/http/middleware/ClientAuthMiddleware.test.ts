import { describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

import { ClientAuthMiddleware } from './ClientAuthMiddleware'
import type { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import type { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

describe('ClientAuthMiddleware', () => {
  const response = {} as Response

  const payload = {
    clientId: 'client-id',
    sessionId: 'session-id',
  }

  const makeRequest = (authorization?: string): Request =>
    ({
      header: vi.fn().mockReturnValue(authorization),
    }) as unknown as Request

  const makeMiddleware = (): {
    middleware: ClientAuthMiddleware
    verify: Mock
    findById: Mock
  } => {
    const verify = vi.fn().mockReturnValue(payload)
    const findById = vi.fn().mockResolvedValue({
      clientId: payload.clientId,
      isActive: vi.fn().mockReturnValue(true),
    })

    const accessTokens = {
      verify,
    } as unknown as ClientAccessTokenService

    const sessions = {
      findById,
    } as unknown as ClientSessionRepository

    const middleware = new ClientAuthMiddleware(accessTokens, sessions)

    return {
      middleware,
      verify,
      findById,
    }
  }

  describe('authenticate()', () => {
    it('authenticates valid bearer token', async () => {
      const { middleware, verify, findById } = makeMiddleware()
      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await middleware.authenticate(req, response, next)

      expect(verify).toHaveBeenCalledTimes(1)
      expect(verify.mock.calls[0]?.[0]).toBe('valid-token')

      expect(findById).toHaveBeenCalledTimes(1)
      expect(findById.mock.calls[0]?.[0]).toBe('session-id')

      expect(req.auth).toEqual(payload)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('throws UnauthorizedError when Authorization header is missing', async () => {
      const { middleware, verify, findById } = makeMiddleware()
      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest()

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(verify).not.toHaveBeenCalled()
      expect(findById).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      expect(req.auth).toBeUndefined()
    })

    it('throws UnauthorizedError when Authorization header is not Bearer', async () => {
      const { middleware, verify, findById } = makeMiddleware()
      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Basic abc123')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(verify).not.toHaveBeenCalled()
      expect(findById).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      expect(req.auth).toBeUndefined()
    })

    it('throws UnauthorizedError when session does not exist', async () => {
      const { middleware, verify, findById } = makeMiddleware()

      findById.mockResolvedValue(null)

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(verify).toHaveBeenCalledTimes(1)
      expect(findById).toHaveBeenCalledTimes(1)
      expect(next).not.toHaveBeenCalled()
      expect(req.auth).toBeUndefined()
    })

    it('throws SESSION_EXPIRED when session is inactive', async () => {
      const { middleware, findById } = makeMiddleware()

      findById.mockResolvedValue({
        clientId: payload.clientId,
        isActive: vi.fn().mockReturnValue(false),
      })

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toMatchObject({
        code: {
          code: 'auth.SESSION_EXPIRED',
        },
        httpStatus: 401,
      })

      expect(next).not.toHaveBeenCalled()
      expect(req.auth).toBeUndefined()
    })

    it('throws UnauthorizedError when session belongs to another client', async () => {
      const { middleware, findById } = makeMiddleware()

      findById.mockResolvedValue({
        clientId: 'another-client',
        isActive: vi.fn().mockReturnValue(true),
      })

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(next).not.toHaveBeenCalled()
      expect(req.auth).toBeUndefined()
    })

    it('passes the token without the Bearer prefix to access token service', async () => {
      const { middleware, verify } = makeMiddleware()

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer abc.def.ghi')

      await middleware.authenticate(req, response, next)

      expect(verify.mock.calls[0]?.[0]).toBe('abc.def.ghi')
    })
  })
})
