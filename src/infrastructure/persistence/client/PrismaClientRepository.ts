import { ClientRepository } from '@aggregates/client/ClientRepository'
import { PrismaClient } from '@generated/prisma/client'
import { injectable } from 'inversify'
import { Email } from '@aggregates/client/Email'
import { Client } from '@aggregates/client/Client'
import { clientToDomain } from './ClientMapper'

@injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Client | null> {
    const raw = await this.prisma.client.findUnique({ where: { id } })
    return raw ? clientToDomain(raw) : null
  }

  async findByEmail(email: Email): Promise<Client | null> {
    const raw = await this.prisma.client.findUnique({
      where: { email: email.toString() },
    })
    return raw ? clientToDomain(raw) : null
  }

  async save(client: Client): Promise<void> {
    await this.prisma.client.upsert({
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
