import { AppError } from './AppError'

export class ConflictError extends AppError {
  constructor(message: string, reason = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, 'CONFLICT', reason, details)
  }
}
