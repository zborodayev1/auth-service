import type { ClientSession } from './ClientSession'

export interface ClientSessionRepository {
  save(session: ClientSession): Promise<void>

  findById(id: string): Promise<ClientSession | null>

  findAllActiveByClientId(clientId: string): Promise<ClientSession[]>

  findByIdAndClientId(id: string, clientId: string): Promise<ClientSession | null>

  revokeAllByClientId(clientId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const ClientSessionRepository: unique symbol = Symbol('ClientSessionRepository')
