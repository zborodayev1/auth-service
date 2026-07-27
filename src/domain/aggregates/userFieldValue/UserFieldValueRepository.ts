import type { UserFieldValue } from './UserFieldValue'

export interface UserFieldValueRepository {
  save(value: UserFieldValue): Promise<void>
  saveMany(values: UserFieldValue[]): Promise<void>
  findByUserId(userId: string): Promise<UserFieldValue[]>
  findByUserAndField(userId: string, fieldId: string): Promise<UserFieldValue | null>
  deleteByFieldId(fieldId: string): Promise<void>
  existsByFieldId(fieldId: string): Promise<boolean>
}

export const UserFieldValueRepository: unique symbol = Symbol('UserFieldValueRepository')
