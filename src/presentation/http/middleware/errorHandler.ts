import type { ErrorRequestHandler } from 'express'
import { AppError } from '@shared/errors/AppError'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      error: {
        reason: err.reason,
        message: err.message,
        details: err.details,
      },
    })
  }

  console.error(err)

  return res.status(500).json({
    error: {
      reason: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  })
}
