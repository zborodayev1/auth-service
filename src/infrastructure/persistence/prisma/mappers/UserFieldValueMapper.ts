import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'
import type { Prisma } from '@generated/prisma/client'

type PrismaUserFieldValueRow = Prisma.UserFieldValueGetPayload<Record<string, never>>

export function userFieldValueToDomain(raw: PrismaUserFieldValueRow): UserFieldValue {
  return UserFieldValue.reconstruct(raw.id, raw.userId, raw.fieldId, raw.value, raw.updatedAt)
}
