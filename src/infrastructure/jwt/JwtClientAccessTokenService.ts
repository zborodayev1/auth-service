import type {
  ClientAccessTokenPayload,
  ClientAccessTokenService,
} from '@ports/ClientAccessTokenService'
import { ServerConfig } from '@config/server/server'
import { inject, injectable } from 'inversify'
import jwt, { JsonWebTokenError } from 'jsonwebtoken'
import { ValidationError } from '@shared/errors/ValidationError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

@injectable()
export class JwtClientAccessTokenService implements ClientAccessTokenService {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  sign(clientId: string, sessionId: string): string {
    const expiresIn = this.config.jwtExpiresInString as jwt.SignOptions['expiresIn'] & string
    return jwt.sign({ sub: clientId, sid: sessionId }, this.config.jwtSecret, {
      expiresIn,
      issuer: 'auth-system',
    })
  }

  verify(token: string): ClientAccessTokenPayload {
    let payload: jwt.JwtPayload | string
    try {
      payload = jwt.verify(token, this.config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'auth-system',
      })
      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        typeof payload['sid'] !== 'string'
      ) {
        throw new ValidationError('Invalid token payload', 'INVALID_TOKEN_PAYLOAD')
      }
      return {
        clientId: payload.sub,
        sessionId: payload['sid'],
      }
    } catch (e) {
      if (e instanceof JsonWebTokenError) {
        throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN')
      }
      throw e
    }
  }
}
