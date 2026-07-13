import { AppError } from './AppError'

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
    reason = 'UNAUTHORIZED',
    details?: Record<string, unknown>,
  ) {
    super(message, 'UNAUTHORIZED', reason, details)
  }
}
