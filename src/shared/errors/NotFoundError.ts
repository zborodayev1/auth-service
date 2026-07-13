import { AppError } from './AppError'

export class NotFoundError extends AppError {
  constructor(message: string, reason = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', reason, details)
  }
}
