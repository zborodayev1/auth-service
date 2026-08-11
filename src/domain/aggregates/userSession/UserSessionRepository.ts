import type { UserSession } from './UserSession'

export interface UserSessionRepository {
  save(session: UserSession): Promise<void>
  findById(id: string): Promise<UserSession | null>
  findByUserId(userId: string): Promise<UserSession[]>
  revokeAllByUserId(userId: string): Promise<void>
  revokeAllByUserIdAndProject(userId: string, projectId: string): Promise<void>
  deleteExpired(): Promise<void>
  deleteByUserId(userId: string): Promise<void>
  deleteByProjectId(projectId: string): Promise<void>
}

export const UserSessionRepository: unique symbol = Symbol('UserSessionRepository')
