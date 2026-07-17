import { AppError } from './AppError'

export class ValidationError extends AppError {
  readonly httpStatus = 400

  constructor(message: string, reason = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', reason, details)
  }
}
