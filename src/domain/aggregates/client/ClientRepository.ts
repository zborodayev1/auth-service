import type { Client } from './Client'
import type { Email } from '../../valueObjects/Email/Email'

export interface ClientRepository {
  findById(id: string): Promise<Client | null>
  findByEmail(email: Email): Promise<Client | null>
  save(client: Client): Promise<void>
  deleteById(clientId: string): Promise<void>
}

export const ClientRepository: unique symbol = Symbol('ClientRepository')
