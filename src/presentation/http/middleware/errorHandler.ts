import type { ErrorRequestHandler } from 'express'
import { AppError } from '@shared/errors/AppError'
import { ILogger } from '@ports/logger/ILogger'
import { injectable, inject } from 'inversify'
import { Request } from 'express'
import { RequestContext } from '@ports/logger/RequestContext'

@injectable()
export class ErrorHandler {
  constructor(
    @inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  handle: ErrorRequestHandler = (err, req, res, _next) => {
    if (err instanceof AppError) {
      this.logger.warn({
        message: err.message,
        context: {
          reason: err.reason,
          details: err.details,
          ...this.getRequestContext(req),
        },
        error: err,
      })

      return res.status(err.httpStatus).json({
        error: {
          message: err.message,
        },
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
