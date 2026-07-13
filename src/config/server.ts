import { InternalServerError } from '@shared/errors/InternalServerError'
import { injectable } from 'inversify'

@injectable()
export class ServerConfig {
  get port(): number {
    const raw = process.env['HTTP_PORT']
    if (raw === undefined) return 8080

    const port = Number(raw)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InternalServerError(
        `Invalid HTTP_PORT: "${raw}". Must be integer between 1 and 65535.`,
      )
    }

    return port
  }

  get bcryptRounds(): number {
    const raw = process.env['BCRYPT_ROUNDS']
    if (raw === undefined) return 12

    const rounds = Number(raw)
    if (!Number.isInteger(rounds) || rounds < 10 || rounds > 31) {
      throw new InternalServerError(
        `Invalid BCRYPT_ROUNDS: "${raw}". Must be integer between 10 and 31.`,
      )
    }

    return rounds
  }

  get jwtSecret(): string {
    const secret = process.env['JWT_SECRET']
    if (!secret || secret.length < 32) {
      throw new InternalServerError('JWT_SECRET must be set and at least 32 characters long')
    }
    return secret
  }

  get jwtExpiresIn(): string {
    return process.env['JWT_EXPIRES_IN'] ?? '1h'
  }

  get refreshTokenTtlMs(): number {
    const raw = process.env['REFRESH_TOKEN_TTL_MS']
    if (raw === undefined) return 30 * 24 * 60 * 60 * 1000

    const ms = Number(raw)
    if (!Number.isInteger(ms) || ms < 1) {
      throw new InternalServerError(
        `Invalid REFRESH_TOKEN_TTL_MS: "${raw}". Must be positive integer.`,
      )
    }
    return ms
  }
}
