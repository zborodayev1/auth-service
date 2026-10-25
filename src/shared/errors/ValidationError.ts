import { AppError } from './AppError'
import type { ValidationCode } from './ErrorCodes'

export class ValidationError extends AppError<ValidationCode> {
  readonly httpStatus = 400
}
