import type { User } from './User'
import type { Email } from '@valueObjects/Email/Email'

export interface UserRepository {
  save(user: User): Promise<void>
  findById(id: string): Promise<User | null>
  findByProjectAndEmail(projectId: string, email: Email): Promise<User | null>
  findByProjectId(projectId: string, opts?: { limit: number; offset: number }): Promise<User[]>
  countByProjectId(projectId: string): Promise<number>
  delete(id: string): Promise<void>
  deleteByProjectId(projectId: string): Promise<void>
}

export const UserRepository: unique symbol = Symbol('UserRepository')
