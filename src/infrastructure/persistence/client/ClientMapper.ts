import { Client } from '@aggregates/client/Client'
import { Email } from '@aggregates/client/Email'
import { Password } from '@aggregates/client/Password'
import type { Prisma } from '@generated/prisma/client'
import { Name } from '@valueObjects/Name'

type PrismaClientRow = Prisma.ClientGetPayload<Record<string, never>>

export function clientToDomain(raw: PrismaClientRow): Client {
  return Client.reconstruct(
    raw.id,
    Name.create(raw.name),
    Email.create(raw.email),
    Password.fromHash(raw.passwordHash),
    raw.createdAt,
  )
}
