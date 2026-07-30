import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable } from 'inversify'
import { Email } from '@valueObjects/Email'
import { Client } from '@aggregates/client/Client'
import { clientToDomain } from '../mappers/ClientMapper'

import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaClientRepository extends PrismaRepository implements ClientRepository {
  async findById(id: string): Promise<Client | null> {
    const raw = await this.prismaClient.client.findUnique({ where: { id } })
    return raw ? clientToDomain(raw) : null
  }

  async findByEmail(email: Email): Promise<Client | null> {
    const raw = await this.prismaClient.client.findUnique({
      where: { email: email.toString() },
    })
    return raw ? clientToDomain(raw) : null
  }

  async save(client: Client): Promise<void> {
    await this.prismaClient.client.upsert({
      where: { id: client.id },
      update: {
        name: client.name,
        email: client.email.toString(),
        passwordHash: client.password.getHash(),
      },
      create: {
        id: client.id,
        name: client.name,
        email: client.email.toString(),
        passwordHash: client.password.getHash(),
      },
    })
  }
}
