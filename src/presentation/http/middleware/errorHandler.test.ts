import type { Mock } from 'vitest'
import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { Prisma } from '@generated/prisma/client'
import { z } from 'zod'

import { ErrorHandler } from './errorHandler'
import { AppError } from '@shared/errors/AppError'
import type { ILogger } from '@ports/logger/ILogger'
import {
  AUTH_ERROR_CODES,
  CONFLICT_ERROR_CODES,
  INTERNAL_ERROR_CODES,
} from '@shared/errors/ErrorCodes'
import type { ServerConfig } from '@config/server/server'

class TestAppError extends AppError {
  readonly httpStatus = 418
}

describe('errorHandler', () => {
  const makeResponse = (): {
    response: Response
    status: Mock
    json: Mock
  } => {
    const json = vi.fn()

    const status = vi.fn().mockReturnValue({
      json,
    })

    const response = {
      status,
    } as unknown as Response

    return {
      response,
      status,
      json,
    }
  }

  const makeRequest = (): Request =>
    ({
      method: 'POST',
      originalUrl: '/api/users?foo=bar',
      ip: '127.0.0.1',
      params: {
        id: 'user-id',
      },
      query: {
        foo: 'bar',
      },
      auth: {
        userId: 'user-id',
        sessionId: 'session-id',
      },
      get: vi.fn().mockReturnValue('Mozilla/5.0'),
    }) as unknown as Request

  const makeHandler = (): {
    handler: ErrorHandler
    logger: {
      error: Mock
      warn: Mock
    }
  } => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
    }

    const serverConfig = {
      exposeErrorCodes: false,
    }

    const handler = new ErrorHandler(logger as unknown as ILogger, serverConfig as ServerConfig)

    return {
      handler,
      logger,
    }
  }

  describe('PrismaClientKnownRequestError', () => {
    it('returns 409 for P2002', () => {
      const { handler, logger } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })

      handler.handle(error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(409)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Resource already exists',
        },
      })

      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Prisma error',
        error,
      })

      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('returns 404 for P2025', () => {
      const { handler, logger } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      })

      handler.handle(error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(404)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Resource not found',
        },
      })

      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Prisma error',
        error,
      })

      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('returns 500 for an unknown Prisma error code', () => {
      const { handler, logger } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const error = new Prisma.PrismaClientKnownRequestError('Some Prisma error', {
        code: 'P2000',
        clientVersion: 'test',
      })

      handler.handle(error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(500)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
        },
      })

      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Prisma error',
        error,
      })

      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('ZodError', () => {
    it('returns 400 with validation error and fields', () => {
      const { handler, logger } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const schema = z.object({
        email: z.email(),
        age: z.number().min(18),
      })

      const result = schema.safeParse({
        email: 'invalid-email',
        age: 12,
      })

      expect(result.success).toBe(false)

      if (result.success) {
        throw new Error('Expected validation to fail')
      }

      handler.handle(result.error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(400)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Validation error',
          fields: z.treeifyError(result.error),
        },
      })

      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('does not log Zod errors', () => {
      const { handler, logger } = makeHandler()
      const { response } = makeResponse()
      const req = makeRequest()

      const schema = z.object({
        email: z.email(),
      })

      const result = schema.safeParse({
        email: 'invalid',
      })

      expect(result.success).toBe(false)

      if (result.success) {
        throw new Error('Expected validation to fail')
      }

      handler.handle(result.error, req, response, vi.fn())

      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('AppError', () => {
    it('returns AppError http status and message', () => {
      const { handler } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const error = new TestAppError('Something went wrong', INTERNAL_ERROR_CODES.INTERNAL_ERROR, {
        foo: 'bar',
      })

      handler.handle(error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(418)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Something went wrong',
        },
      })
    })

    it('logs AppError as warning using code and details', () => {
      const { handler, logger } = makeHandler()
      const { response } = makeResponse()
      const req = makeRequest()

      const error = new TestAppError('Something went wrong', CONFLICT_ERROR_CODES.ALREADY_EXISTS, {
        foo: 'bar',
      })

      handler.handle(error, req, response, vi.fn())

      expect(logger.warn).toHaveBeenCalledTimes(1)

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Something went wrong',
        context: {
          code: 'conflict.ALREADY_EXISTS',
          details: {
            foo: 'bar',
          },
          method: 'POST',
          originalUrl: '/api/users?foo=bar',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          params: {
            id: 'user-id',
          },
          query: {
            foo: 'bar',
          },
          auth: {
            userId: 'user-id',
            sessionId: 'session-id',
          },
        },
        error,
      })
    })

    it('includes undefined details when AppError has no details', () => {
      const { handler, logger } = makeHandler()
      const { response } = makeResponse()
      const req = makeRequest()

      const error = new TestAppError('Unauthorized', AUTH_ERROR_CODES.INVALID_CREDENTIALS)

      handler.handle(error, req, response, vi.fn())

      expect(logger.warn).toHaveBeenCalledWith({
        message: 'Unauthorized',
        context: {
          code: 'auth.INVALID_CREDENTIALS',
          details: undefined,
          method: 'POST',
          originalUrl: '/api/users?foo=bar',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          params: {
            id: 'user-id',
          },
          query: {
            foo: 'bar',
          },
          auth: {
            userId: 'user-id',
            sessionId: 'session-id',
          },
        },
        error,
      })
    })

    it('supports exposed error codes', () => {
      const { handler } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const error = new TestAppError('Session expired', AUTH_ERROR_CODES.SESSION_EXPIRED)

      handler.handle(error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(418)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Session expired',
          code: 'auth.SESSION_EXPIRED',
        },
      })
    })

    it('does not expose non-public error code by default', () => {
      const { handler } = makeHandler()
      const { response, json } = makeResponse()
      const req = makeRequest()

      const error = new TestAppError(
        'Sensitive internal details',
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      )

      handler.handle(error, req, response, vi.fn())

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Sensitive internal details',
        },
      })
    })

    it('supports non-exposed error codes', () => {
      const { handler } = makeHandler()
      const { response, json } = makeResponse()
      const req = makeRequest()

      const error = new TestAppError(
        'Sensitive internal details',
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      )

      handler.handle(error, req, response, vi.fn())

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Sensitive internal details',
        },
      })
    })
  })

  describe('unknown errors', () => {
    it('returns 500 for an Error', () => {
      const { handler, logger } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      const error = new Error('Database connection failed')

      handler.handle(error, req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(500)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
        },
      })

      expect(logger.error).toHaveBeenCalledTimes(1)

      expect(logger.error).toHaveBeenCalledWith({
        message: 'Unhandled exception',
        context: {
          method: 'POST',
          originalUrl: '/api/users?foo=bar',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          params: {
            id: 'user-id',
          },
          query: {
            foo: 'bar',
          },
          auth: {
            userId: 'user-id',
            sessionId: 'session-id',
          },
        },
        error,
      })

      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('logs undefined error for a non-Error thrown value', () => {
      const { handler, logger } = makeHandler()
      const { response, status, json } = makeResponse()
      const req = makeRequest()

      handler.handle('something went wrong', req, response, vi.fn())

      expect(status).toHaveBeenCalledWith(500)

      expect(json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
        },
      })

      expect(logger.error).toHaveBeenCalledWith({
        message: 'Unhandled exception',
        context: {
          method: 'POST',
          originalUrl: '/api/users?foo=bar',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          params: {
            id: 'user-id',
          },
          query: {
            foo: 'bar',
          },
          auth: {
            userId: 'user-id',
            sessionId: 'session-id',
          },
        },
        error: undefined,
      })

      expect(logger.warn).not.toHaveBeenCalled()
    })
  })
})
