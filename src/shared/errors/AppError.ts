export abstract class AppError extends Error {
  abstract readonly httpStatus: number

  constructor(
    message: string,
    public readonly category: string,
    public readonly reason: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
    Error.captureStackTrace(this, new.target)
  }
}
