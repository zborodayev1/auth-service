import { AppError } from './AppError'

export class InternalServerError extends AppError {
  readonly httpStatus = 500

  constructor(
    message: string,
    reason = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, 'INTERNAL_SERVER_ERROR', reason, details)
  }
}
