import type {
  ClientAccessTokenPayload,
  ClientAccessTokenService,
} from '@ports/ClientAccessTokenService'
import { ServerConfig } from '@config/server/server'
import { inject, injectable } from 'inversify'
import jwt from 'jsonwebtoken'
import { ValidationError } from '@shared/errors/ValidationError'

@injectable()
export class JwtClientAccessTokenService implements ClientAccessTokenService {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  sign(clientId: string, sessionId: string): string {
    const expiresIn = this.config.jwtExpiresInString as jwt.SignOptions['expiresIn'] & string
    return jwt.sign({ sub: clientId, sid: sessionId }, this.config.jwtSecret, { expiresIn })
  }

  verify(token: string): ClientAccessTokenPayload {
    const payload = jwt.verify(token, this.config.jwtSecret, {
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
  }
}
