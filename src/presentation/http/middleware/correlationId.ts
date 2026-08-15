import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { requestStore } from '@infra/logger/RequestStore'

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['x-request-id']
  const id = typeof header === 'string' ? header : randomUUID()
  req.requestId = id
  res.setHeader('x-request-id', id)
  requestStore.run({ requestId: id }, next)
}
