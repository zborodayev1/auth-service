import type { ClientSession } from './ClientSession'

export interface ClientSessionRepository {
  save(session: ClientSession): Promise<void>

  findById(id: string): Promise<ClientSession | null>

  findByClientId(clientId: string): Promise<ClientSession[]>

  revokeAllByClientId(clientId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const ClientSessionRepository: unique symbol = Symbol('ClientSessionRepository')
