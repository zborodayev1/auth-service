import type { ErrorRequestHandler } from 'express'
import { ILogger } from '@ports/logger/ILogger'
import { injectable, inject } from 'inversify'
import { Request } from 'express'
import { RequestContext } from '@ports/logger/RequestContext'
import z, { ZodError } from 'zod'
import { Prisma } from '@generated/prisma/client'
import { isAppError } from '@shared/errors/isAppError'
import { ServerConfig } from '@config/server/server'

@injectable()
export class ErrorHandler {
  constructor(
    @inject(ILogger)
    private readonly logger: ILogger,

    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {}

  handle: ErrorRequestHandler = (err, req, res, _next) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error({
        message: 'Prisma error',
        error: err,
      })
      if (err.code === 'P2002') {
        return res.status(409).json({ error: { message: 'Resource already exists' } })
      }
      if (err.code === 'P2025') {
        return res.status(404).json({ error: { message: 'Resource not found' } })
      }
      return res.status(500).json({ error: { message: 'Internal server error' } })
    }

    if (err instanceof ZodError) {
      return res.status(400).json({
        error: {
          message: 'Validation error',
          fields: z.treeifyError(err),
        },
      })
    }

    if (isAppError(err)) {
      this.logger.warn({
        message: err.message,
        context: {
          code: err.code.code,
          details: err.details,
          ...this.getRequestContext(req),
        },
        error: err,
      })

      let error: {
        message: string
        code?: string
      } = {
        message: err.message,
      }

      if (err.code.expose || this.serverConfig.exposeErrorCodes) {
        error.code = err.code.code
      }

      return res.status(err.httpStatus).json({
        error,
      })
    }

    this.logger.error({
      message: 'Unhandled exception',
      context: {
        ...this.getRequestContext(req),
      },
      error: err instanceof Error ? err : undefined,
    })

    return res.status(500).json({
      error: {
        message: 'Internal server error',
      },
    })
  }

  private getRequestContext(req: Request): RequestContext {
    return {
      method: req.method,
      originalUrl: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      params: req.params,
      query: req.query,
      auth: req.auth,
    }
  }
}
