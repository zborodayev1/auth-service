import type { Client } from './Client'
import type { Email } from './Email'

export interface ClientRepository {
  findById(id: string): Promise<Client | null>
  findByEmail(email: Email): Promise<Client | null>
  save(client: Client): Promise<void>
}

export const ClientRepository: unique symbol = Symbol('ClientRepository')
