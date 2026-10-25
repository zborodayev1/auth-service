import type { ErrorCode } from './defineCodes'

export abstract class AppError<TCode extends ErrorCode = ErrorCode> extends Error {
  abstract readonly httpStatus: number

  constructor(
    message: string,
    public readonly code: TCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
    Error.captureStackTrace(this, new.target)
  }
}
