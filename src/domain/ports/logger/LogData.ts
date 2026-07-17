export interface LogData {
  message: string
  context?: Record<string, unknown>
}

export type ErrorLogData = LogData & {
  error?: Error | undefined
}
