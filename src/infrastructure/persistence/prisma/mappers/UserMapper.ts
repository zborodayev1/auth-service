import { User } from '@aggregates/user/User'
import { Email } from '@aggregates/client/Email'
import { Password } from '@aggregates/client/Password'
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
