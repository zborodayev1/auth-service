import type { RefreshToken } from './RefreshToken'

export interface RefreshTokenRepository {
  save(token: RefreshToken): Promise<void>

  findById(id: string): Promise<RefreshToken | null>

  findByHash(hash: string): Promise<RefreshToken | null>

  findBySessionId(sessionId: string): Promise<RefreshToken[]>

  revokeAllBySessionId(sessionId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const RefreshTokenRepository = Symbol('RefreshTokenRepository')
