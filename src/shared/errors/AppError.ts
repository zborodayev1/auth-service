export abstract class AppError extends Error {
  public readonly origin: string | undefined

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
