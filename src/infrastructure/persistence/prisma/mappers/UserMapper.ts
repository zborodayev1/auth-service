import { User } from '@aggregates/user/User'
import { Email } from '@valueObjects/Email'
import { Password } from '@valueObjects/Password'
import type { Prisma } from '@generated/prisma/client'

type PrismaUserRow = Prisma.UserGetPayload<Record<string, never>>

export function userToDomain(raw: PrismaUserRow): User {
  return User.reconstruct(
    raw.id,
    raw.projectId,
    Email.create(raw.email),
    Password.fromHash(raw.passwordHash),
    raw.createdAt,
  )
}
