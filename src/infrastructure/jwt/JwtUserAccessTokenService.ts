import type { UserAccessTokenPayload, UserAccessTokenService } from '@ports/UserAccessTokenService'
import { ServerConfig } from '@config/server/server'
import { inject, injectable } from 'inversify'
import jwt, { JsonWebTokenError } from 'jsonwebtoken'
import { ValidationError } from '@shared/errors/ValidationError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { AUTH_ERROR_CODES, VALIDATION_ERROR_CODES } from '@shared/errors/ErrorCodes'

@injectable()
export class JwtUserAccessTokenService implements UserAccessTokenService {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  sign(userId: string, projectId: string, sessionId: string, projectJwtSecret: string): string {
    const expiresIn = this.config.jwtExpiresInString as jwt.SignOptions['expiresIn'] & string
    return jwt.sign(
      { sub: userId, pid: projectId, sid: sessionId, type: 'user' },
      projectJwtSecret,
      { expiresIn, issuer: 'auth-system' },
    )
  }

  verify(token: string, projectJwtSecret: string): UserAccessTokenPayload {
    let payload: jwt.JwtPayload | string
    try {
      payload = jwt.verify(token, projectJwtSecret, {
        algorithms: ['HS256'],
        issuer: 'auth-system',
      })

      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        typeof payload['pid'] !== 'string' ||
        typeof payload['sid'] !== 'string' ||
        payload['type'] !== 'user'
      ) {
        throw new ValidationError('Invalid token payload', VALIDATION_ERROR_CODES.INVALID_INPUT)
      }

      return {
        userId: payload.sub,
        projectId: payload['pid'],
        sessionId: payload['sid'],
      }
    } catch (e) {
      if (e instanceof JsonWebTokenError) {
        throw new UnauthorizedError(
          'Invalid or expired token',
          AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        )
      }
      throw e
    }
  }

  decodeUnverified(token: string): { projectId: string } | null {
    const decoded = jwt.decode(token) as { pid?: string } | null
    if (!decoded?.pid) return null
    return { projectId: decoded.pid }
  }
}
