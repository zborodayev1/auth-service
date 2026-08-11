import { Client } from '@aggregates/client/Client'
import { Email } from '@valueObjects/Email/Email'
import { Password } from '@valueObjects/Password/Password'
import type { Prisma } from '@generated/prisma/client'
import { Name } from '@valueObjects/Name/Name'

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
