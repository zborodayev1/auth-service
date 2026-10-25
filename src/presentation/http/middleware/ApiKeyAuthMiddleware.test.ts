import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

import { ApiKeyAuthMiddleware } from './ApiKeyAuthMiddleware'
import type { ProjectApiKeyService } from '@ports/ProjectApiKeyService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'

describe('ApiKeyAuthMiddleware', () => {
  const response = {} as Response

  const makeRequest = (apiKey?: string): Request =>
    ({
      header: vi.fn().mockReturnValue(apiKey),
    }) as unknown as Request

  it('authenticates valid API key', async () => {
    const payload = {
      clientId: 'client-id',
      projectId: 'project-id',
    }

    const verify = vi.fn().mockResolvedValue(payload)

    const apiKeyService = {
      verify,
    } as unknown as ProjectApiKeyService

    const middleware = new ApiKeyAuthMiddleware(apiKeyService)

    const req = makeRequest('valid-api-key')
    const next = vi.fn() as NextFunction

    await middleware.authenticate(req, response, next)

    expect(verify).toHaveBeenCalledWith('valid-api-key')
    expect(req.projectAuth).toEqual(payload)
    expect(next).toHaveBeenCalledOnce()
  })

  it('throws UnauthorizedError when API key is missing', async () => {
    const verify = vi.fn()

    const apiKeyService = {
      verify,
    } as unknown as ProjectApiKeyService

    const middleware = new ApiKeyAuthMiddleware(apiKeyService)

    const req = makeRequest()
    const next = vi.fn() as NextFunction

    await expect(middleware.authenticate(req, response, next)).rejects.toThrow(UnauthorizedError)

    expect(verify).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('propagates API key verification error', async () => {
    const error = new UnauthorizedError('Invalid credentials', AUTH_ERROR_CODES.INVALID_CREDENTIALS)

    const verify = vi.fn().mockRejectedValue(error)

    const apiKeyService = {
      verify,
    } as unknown as ProjectApiKeyService

    const middleware = new ApiKeyAuthMiddleware(apiKeyService)

    const req = makeRequest('invalid-api-key')
    const next = vi.fn() as NextFunction

    await expect(middleware.authenticate(req, response, next)).rejects.toThrow(UnauthorizedError)

    expect(next).not.toHaveBeenCalled()
    expect(req.projectAuth).toBeUndefined()
  })
})
