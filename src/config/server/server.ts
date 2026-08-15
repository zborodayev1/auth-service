import { InternalServerError } from '@shared/errors/InternalServerError'
import { injectable } from 'inversify'
import ms, { type StringValue } from 'ms'
import { Environment, environments, LogLevel, logLevels } from './types'

@injectable()
export class ServerConfig {
  readonly port: number
  readonly bcryptRounds: number
  readonly jwtSecret: string
  readonly jwtExpiresInMs: number
  readonly jwtExpiresInString: string
  readonly refreshTokenTtlMs: number
  readonly cookieMaxAge: number
  readonly dbUrl: string
  readonly redisUrl: string
  readonly logLevel: LogLevel
  readonly environment: Environment
  readonly softDeleteTtlMs: number

  constructor() {
    this.port = this.integer('HTTP_PORT', 8080, 1, 65535)

    this.bcryptRounds = this.integer('BCRYPT_ROUNDS', 12, 10, 31)

    this.jwtSecret = this.string('JWT_SECRET', undefined, 32)

    this.jwtExpiresInString = this.string('JWT_EXPIRES_IN', '1h')

    this.jwtExpiresInMs = this.duration('JWT_EXPIRES_IN', '1h')

    this.cookieMaxAge = this.duration('COOKIE_MAX_AGE', '1h')

    this.refreshTokenTtlMs = this.duration('REFRESH_TOKEN_TTL_MS', '30d')

    this.dbUrl = this.string('DATABASE_URL')

    this.redisUrl = this.string('REDIS_URL', 'redis://localhost:6379')

    this.softDeleteTtlMs = this.duration('SOFT_DELETE_TTL', '7d')

    this.logLevel = this.enumValue('LOG_LEVEL', logLevels, 'info')

    this.environment = this.enumValue('NODE_ENV', environments, 'development')
  }

  get isProduction(): boolean {
    return this.environment === 'production'
  }

  get isTest(): boolean {
    return this.environment === 'test'
  }

  private string(name: string, defaultValue?: string, minLength?: number): string {
    const value = process.env[name]

    if (defaultValue && !value) {
      return defaultValue
    }

    if (!value) {
      throw new InternalServerError(`${name} must be set`)
    }

    if (minLength && value.length < minLength) {
      throw new InternalServerError(`${name} must be at least ${String(minLength)} characters`)
    }

    return value
  }

  private integer(name: string, defaultValue: number, min: number, max: number): number {
    const raw = process.env[name]
    const value = Number(raw ?? defaultValue)

    if (!Number.isInteger(value) || value < min || value > max) {
      throw new InternalServerError(
        `${name} must be an integer between ${String(min)} and ${String(max)}. Received: ${String(raw ?? defaultValue)}`,
      )
    }

    return value
  }

  private duration(name: string, defaultValue: StringValue): number {
    const raw = process.env[name] ?? defaultValue

    const value = ms(raw as StringValue) as number | undefined

    if (typeof value !== 'number' || value <= 0) {
      throw new InternalServerError(
        `${name} must be a valid positive duration (e.g. "1h", "30m", "7d"). Received: ${raw}`,
      )
    }

    return value
  }

  private enumValue<T extends readonly string[]>(
    name: string,
    values: T,
    defaultValue: T[number],
  ): T[number] {
    const raw = process.env[name] ?? defaultValue

    if (!values.includes(raw as T[number])) {
      throw new InternalServerError(
        `${name} must be one of: ${values.join(', ')}. Received: ${raw}`,
      )
    }

    return raw as T[number]
  }
}
