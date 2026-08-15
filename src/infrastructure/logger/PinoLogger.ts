import { inject, injectable } from 'inversify'
import pino, { type Logger, type LoggerOptions } from 'pino'
import { ServerConfig } from '@config/server/server'
import { ErrorLogData, LogData } from '@ports/logger/LogData'
import { ILogger } from '@ports/logger/ILogger'
import { requestStore } from './RequestStore'

@injectable()
export class PinoLogger implements ILogger {
  private readonly logger: Logger

  constructor(
    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {
    const options: LoggerOptions = {
      level: this.serverConfig.logLevel,
      name: 'auth-service',
    }

    if (!this.serverConfig.isProduction) {
      options.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    }

    this.logger = pino(options)
  }

  private ctx(extra?: Record<string, unknown>): Record<string, unknown> {
    const requestId = requestStore.getStore()?.requestId
    return { ...extra, ...(requestId ? { requestId } : {}) }
  }
  info(data: LogData): void {
    this.logger.info(this.ctx(data.context), data.message)
  }
  warn(data: ErrorLogData): void {
    this.logger.warn(this.ctx({ ...data.context, err: data.error }), data.message)
  }

  debug(data: LogData): void {
    this.logger.debug(this.ctx(data.context), data.message)
  }

  error(data: ErrorLogData): void {
    this.logger.error(this.ctx({ ...data.context, err: data.error }), data.message)
  }
}
