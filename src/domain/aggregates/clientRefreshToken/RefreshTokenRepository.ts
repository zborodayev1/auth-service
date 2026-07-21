import type { ClientRefreshToken } from './RefreshToken'

export interface RefreshTokenRepository {
  save(token: ClientRefreshToken): Promise<void>

  findById(id: string): Promise<ClientRefreshToken | null>

  findByHash(hash: string): Promise<ClientRefreshToken | null>

  findBySessionId(sessionId: string): Promise<ClientRefreshToken[]>

  revokeAllBySessionId(sessionId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const RefreshTokenRepository: unique symbol = Symbol('RefreshTokenRepository')
