import { AppError } from './AppError'
import type { InternalErrorCode } from './ErrorCodes'

export class InternalServerError extends AppError<InternalErrorCode> {
  readonly httpStatus = 500
}
