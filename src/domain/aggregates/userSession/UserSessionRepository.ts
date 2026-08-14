import type { UserSession } from './UserSession'

export interface UserSessionRepository {
  save(session: UserSession): Promise<void>
  findById(id: string): Promise<UserSession | null>
  findAllActiveByUserId(userId: string): Promise<UserSession[]>

  findByIdAndUserId(id: string, userId: string): Promise<UserSession | null>

  revokeAllByUserId(userId: string): Promise<void>
  revokeAllByUserIdAndProject(userId: string, projectId: string): Promise<void>
  deleteExpired(): Promise<void>
  deleteByUserId(userId: string): Promise<void>
  deleteByProjectId(projectId: string): Promise<void>
}

export const UserSessionRepository: unique symbol = Symbol('UserSessionRepository')
