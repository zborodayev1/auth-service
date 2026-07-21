import type { ClientRefreshToken } from './RefreshToken'

export interface ClientRefreshTokenRepository {
  save(token: ClientRefreshToken): Promise<void>

  findById(id: string): Promise<ClientRefreshToken | null>

  findByHash(hash: string): Promise<ClientRefreshToken | null>

  findBySessionId(sessionId: string): Promise<ClientRefreshToken[]>

  revokeAllBySessionId(sessionId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const ClientRefreshTokenRepository: unique symbol = Symbol('ClientRefreshTokenRepository')
