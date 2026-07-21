import type { User } from './User'
import type { Email } from '@aggregates/client/Email'

export interface UserRepository {
  save(user: User): Promise<void>
  findById(id: string): Promise<User | null>
  findByProjectAndEmail(projectId: string, email: Email): Promise<User | null>
}

export const UserRepository: unique symbol = Symbol('UserRepository')
