export interface AccessTokenPayload {
  clientId: string
  sessionId: string
}

export interface AccessTokenService {
  sign(clientId: string, sessionId: string): string
  verify(token: string): AccessTokenPayload
}

export const AccessTokenService: unique symbol = Symbol('AccessTokenService')
