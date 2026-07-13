import type { AccessTokenPayload, AccessTokenService } from '@ports/AccessTokenService'
import { ServerConfig } from '@config/server'
import { inject, injectable } from 'inversify'
import jwt from 'jsonwebtoken'
import { ValidationError } from '@shared/errors/ValidationError'

@injectable()
export class JwtAccessTokenService implements AccessTokenService {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  sign(clientId: string, sessionId: string): string {
    const expiresIn = this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'] & string
    return jwt.sign({ sub: clientId, sid: sessionId }, this.config.jwtSecret, { expiresIn })
  }

  verify(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, this.config.jwtSecret)
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
