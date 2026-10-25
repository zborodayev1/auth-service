import { AppError } from './AppError'
import type { ConflictCode } from './ErrorCodes'

export class ConflictError extends AppError<ConflictCode> {
  readonly httpStatus = 409
}
