import type { PendingActionContext } from '@aggregates/pendingAction/PendingAction'
import { PendingAction } from '@aggregates/pendingAction/PendingAction'
import type { Prisma } from '@generated/prisma/client'

type PrismaPendingActionRow = Prisma.PendingActionGetPayload<Record<string, never>>

export function pendingActionToDomain(raw: PrismaPendingActionRow): PendingAction {
  return PendingAction.reconstruct(
    raw.id,
    raw.tokenHash,
    raw.context as PendingActionContext,
    raw.expiresAt,
    raw.createdAt,
  )
}
