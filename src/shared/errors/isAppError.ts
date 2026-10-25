import { AppError } from './AppError'

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
