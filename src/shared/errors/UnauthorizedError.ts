import { AppError } from './AppError'
import type { AuthCode } from './ErrorCodes'

export class UnauthorizedError extends AppError<AuthCode> {
  readonly httpStatus = 401
}
