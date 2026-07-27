export interface ClientAccessTokenPayload {
  clientId: string
  sessionId: string
}

export interface ClientAccessTokenService {
  sign(clientId: string, sessionId: string): string
  verify(token: string): ClientAccessTokenPayload
}

export const ClientAccessTokenService: unique symbol = Symbol('ClientAccessTokenService')
