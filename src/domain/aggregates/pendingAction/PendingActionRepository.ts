import type { PendingAction } from './PendingAction'

export interface PendingActionRepository {
  findByTokenHash(hash: string): Promise<PendingAction | null>
  save(action: PendingAction): Promise<void>
  delete(id: string): Promise<void>
  deleteExpired(): Promise<void>
  consumeByTokenHash(hash: string): Promise<PendingAction | null>
}

export const PendingActionRepository: unique symbol = Symbol('PendingActionRepository')
