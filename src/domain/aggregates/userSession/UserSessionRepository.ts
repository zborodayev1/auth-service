import type { UserSession } from './UserSession'

export interface UserSessionRepository {
  save(session: UserSession): Promise<void>
  findById(id: string): Promise<UserSession | null>
  findByUserId(userId: string): Promise<UserSession[]>
  revokeAllByUserId(userId: string): Promise<void>
  deleteExpired(): Promise<void>
}

export const UserSessionRepository: unique symbol = Symbol('UserSessionRepository')
