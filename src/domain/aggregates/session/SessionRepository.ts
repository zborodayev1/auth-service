import type { Session } from './Session'

export interface SessionRepository {
  save(session: Session): Promise<void>

  findById(id: string): Promise<Session | null>

  findByRefreshTokenHash(hash: string): Promise<Session | null>

  findByClientId(clientId: string): Promise<Session[]>

  revokeAllByClientId(clientId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const SessionRepository: unique symbol = Symbol('SessionRepository')
