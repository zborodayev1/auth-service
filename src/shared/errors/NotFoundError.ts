import { AppError } from './AppError'
import type { NotFoundCode } from './ErrorCodes'

export class NotFoundError extends AppError<NotFoundCode> {
  readonly httpStatus = 404
}
