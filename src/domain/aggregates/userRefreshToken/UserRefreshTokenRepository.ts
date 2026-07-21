import type { UserRefreshToken } from './UserRefreshToken'

export interface UserRefreshTokenRepository {
  save(token: UserRefreshToken): Promise<void>
  findById(id: string): Promise<UserRefreshToken | null>
  findByHash(hash: string): Promise<UserRefreshToken | null>
  findBySessionId(sessionId: string): Promise<UserRefreshToken[]>
  revokeAllBySessionId(sessionId: string): Promise<void>
  deleteExpired(): Promise<void>
}

export const UserRefreshTokenRepository: unique symbol = Symbol('UserRefreshTokenRepository')
