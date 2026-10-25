import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

import { correlationId } from './correlationId'
import { requestStore } from '@infra/pino/RequestStore'

describe('correlationId', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses x-request-id from request', () => {
    const req = {
      headers: {
        'x-request-id': 'request-123',
      },
    } as unknown as Request

    const setHeader = vi.fn()
    const res = {
      setHeader,
    } as unknown as Response

    const next = vi.fn() as NextFunction

    const run = vi.spyOn(requestStore, 'run').mockImplementation((_context, callback) => callback())

    correlationId(req, res, next)

    expect(req.requestId).toBe('request-123')
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-123')

    expect(run).toHaveBeenCalledWith({ requestId: 'request-123' }, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('generates request id when header is missing', () => {
    const req = {
      headers: {},
    } as unknown as Request

    const setHeader = vi.fn()
    const res = {
      setHeader,
    } as unknown as Response

    const next = vi.fn() as NextFunction

    vi.spyOn(requestStore, 'run').mockImplementation((_context, callback) => callback())

    correlationId(req, res, next)

    expect(typeof req.requestId).toBe('string')
    expect(req.requestId.length).toBeGreaterThan(0)

    expect(setHeader).toHaveBeenCalledWith('x-request-id', req.requestId)

    expect(next).toHaveBeenCalledOnce()
  })
})
