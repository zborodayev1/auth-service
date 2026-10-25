import type { Mock } from 'vitest'
import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

import { UserAuthMiddleware } from './UserAuthMiddleware'
import type { UserAccessTokenService } from '@ports/UserAccessTokenService'
import type { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import type { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

describe('UserAuthMiddleware', () => {
  const response = {} as Response

  const payload = {
    userId: 'user-id',
    sessionId: 'session-id',
    projectId: 'project-id',
  }

  const project = {
    id: 'project-id',
    jwtSecret: 'project-secret',
  }

  const makeRequest = (authorization?: string, projectAuth?: { projectId: string }): Request =>
    ({
      header: vi.fn().mockReturnValue(authorization),
      projectAuth,
    }) as unknown as Request

  const makeMiddleware = (): {
    middleware: UserAuthMiddleware
    decodeUnverified: Mock
    verify: Mock
    findSessionById: Mock
    findProjectById: Mock
  } => {
    const decodeUnverified = vi.fn().mockReturnValue(payload)

    const verify = vi.fn().mockReturnValue(payload)

    const findSessionById = vi.fn().mockResolvedValue({
      userId: payload.userId,
      isActive: vi.fn().mockReturnValue(true),
    })

    const findProjectById = vi.fn().mockResolvedValue(project)

    const accessTokens = {
      decodeUnverified,
      verify,
    } as unknown as UserAccessTokenService

    const sessions = {
      findById: findSessionById,
    } as unknown as UserSessionRepository

    const projects = {
      findById: findProjectById,
    } as unknown as ProjectRepository

    const middleware = new UserAuthMiddleware(accessTokens, sessions, projects)

    return {
      middleware,
      decodeUnverified,
      verify,
      findSessionById,
      findProjectById,
    }
  }

  describe('authenticate()', () => {
    it('authenticates valid bearer token', async () => {
      const { middleware, decodeUnverified, verify, findProjectById, findSessionById } =
        makeMiddleware()

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await middleware.authenticate(req, response, next)

      expect(decodeUnverified).toHaveBeenCalledTimes(1)
      expect(decodeUnverified.mock.calls[0]?.[0]).toBe('valid-token')

      expect(findProjectById).toHaveBeenCalledTimes(1)
      expect(findProjectById.mock.calls[0]?.[0]).toBe('project-id')

      expect(verify).toHaveBeenCalledTimes(1)

      const verifyArgs = verify.mock.calls[0]

      expect(verifyArgs?.[0]).toBe('valid-token')
      expect(verifyArgs?.[1]).toBe('project-secret')

      expect(findSessionById).toHaveBeenCalledTimes(1)
      expect(findSessionById.mock.calls[0]?.[0]).toBe('session-id')

      expect(req.userAuth).toEqual(payload)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('throws UnauthorizedError when Authorization header is missing', async () => {
      const { middleware, decodeUnverified, verify, findProjectById, findSessionById } =
        makeMiddleware()

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest()

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(decodeUnverified).not.toHaveBeenCalled()
      expect(verify).not.toHaveBeenCalled()
      expect(findProjectById).not.toHaveBeenCalled()
      expect(findSessionById).not.toHaveBeenCalled()

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('throws UnauthorizedError when Authorization header is not Bearer', async () => {
      const { middleware, decodeUnverified, verify, findProjectById, findSessionById } =
        makeMiddleware()

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Basic abc123')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(decodeUnverified).not.toHaveBeenCalled()
      expect(verify).not.toHaveBeenCalled()
      expect(findProjectById).not.toHaveBeenCalled()
      expect(findSessionById).not.toHaveBeenCalled()

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('throws UnauthorizedError when token cannot be decoded', async () => {
      const { middleware, decodeUnverified, verify, findProjectById } = makeMiddleware()

      decodeUnverified.mockReturnValue(null)

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer invalid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(decodeUnverified).toHaveBeenCalledTimes(1)
      expect(verify).not.toHaveBeenCalled()
      expect(findProjectById).not.toHaveBeenCalled()

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('throws UnauthorizedError when project does not exist', async () => {
      const { middleware, decodeUnverified, verify, findProjectById, findSessionById } =
        makeMiddleware()

      findProjectById.mockResolvedValue(null)

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(decodeUnverified).toHaveBeenCalledTimes(1)
      expect(findProjectById).toHaveBeenCalledTimes(1)

      expect(verify).not.toHaveBeenCalled()
      expect(findSessionById).not.toHaveBeenCalled()

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('throws UnauthorizedError when project from API key does not match token project', async () => {
      const { middleware, verify, findSessionById } = makeMiddleware()

      const next = vi.fn() as unknown as NextFunction

      const req = makeRequest('Bearer valid-token', {
        projectId: 'another-project-id',
      })

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(verify).toHaveBeenCalledTimes(1)
      expect(findSessionById).not.toHaveBeenCalled()

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('throws UnauthorizedError when session does not exist', async () => {
      const { middleware, findSessionById } = makeMiddleware()

      findSessionById.mockResolvedValue(null)

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(findSessionById).toHaveBeenCalledTimes(1)

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('throws SESSION_EXPIRED when session is inactive', async () => {
      const { middleware, findSessionById } = makeMiddleware()

      findSessionById.mockResolvedValue({
        userId: payload.userId,
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
      expect(req.userAuth).toBeUndefined()
    })

    it('throws UnauthorizedError when session belongs to another user', async () => {
      const { middleware, findSessionById } = makeMiddleware()

      findSessionById.mockResolvedValue({
        userId: 'another-user-id',
        isActive: vi.fn().mockReturnValue(true),
      })

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await expect(middleware.authenticate(req, response, next)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )

      expect(next).not.toHaveBeenCalled()
      expect(req.userAuth).toBeUndefined()
    })

    it('sets userAuth and calls next after successful authentication', async () => {
      const { middleware } = makeMiddleware()

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer valid-token')

      await middleware.authenticate(req, response, next)

      expect(req.userAuth).toEqual(payload)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('passes token without Bearer prefix to token services', async () => {
      const { middleware, decodeUnverified, verify } = makeMiddleware()

      const next = vi.fn() as unknown as NextFunction
      const req = makeRequest('Bearer abc.def.ghi')

      await middleware.authenticate(req, response, next)

      expect(decodeUnverified.mock.calls[0]?.[0]).toBe('abc.def.ghi')
      expect(verify.mock.calls[0]?.[0]).toBe('abc.def.ghi')
    })
  })
})
