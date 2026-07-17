import type { LogData, ErrorLogData } from './LogData'

export interface ILogger {
  info(data: LogData): void

  warn(data: ErrorLogData): void

  error(data: ErrorLogData): void

  debug(data: LogData): void
}

export const ILogger: unique symbol = Symbol('ILogger')
