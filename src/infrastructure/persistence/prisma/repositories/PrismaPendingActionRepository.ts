import { injectable, inject } from 'inversify'
import { PendingAction } from '@aggregates/pendingAction/PendingAction'
import type { PendingActionRepository } from '@aggregates/pendingAction/PendingActionRepository'
import { pendingActionToDomain } from '../mappers/PendingActionMapper'
import { TransactionContext } from '../TransactionContext'
import { PrismaRepository } from '../PrismaRepository'
import { Prisma } from '@generated/prisma/client'

type PrismaPendingActionRow = Prisma.PendingActionGetPayload<Record<string, never>>

@injectable()
export class PrismaPendingActionRepository
  extends PrismaRepository
  implements PendingActionRepository
{
  constructor(@inject(TransactionContext) ctx: TransactionContext) {
    super(ctx)
  }

  async save(action: PendingAction): Promise<void> {
    const context: Prisma.InputJsonValue = action.context
    await this.prismaClient.pendingAction.upsert({
      where: {
        id: action.id,
      },
      create: {
        id: action.id,
        tokenHash: action.tokenHash,
        context: context,
        expiresAt: action.expiresAt,
      },
      update: {
        tokenHash: action.tokenHash,
        context: context,
        expiresAt: action.expiresAt,
      },
    })
  }

  async findByTokenHash(hash: string): Promise<PendingAction | null> {
    const raw = await this.prismaClient.pendingAction.findUnique({
      where: {
        tokenHash: hash,
      },
    })

    return raw ? pendingActionToDomain(raw) : null
  }

  async delete(id: string): Promise<void> {
    await this.prismaClient.pendingAction.delete({
      where: {
        id,
      },
    })
  }

  async deleteExpired(before: Date): Promise<void> {
    await this.prismaClient.pendingAction.deleteMany({
      where: {
        expiresAt: {
          lt: before,
        },
      },
    })
  }

  async consumeByTokenHash(hash: string): Promise<PendingAction | null> {
    const rows = await this.prismaClient.$queryRaw<PrismaPendingActionRow[]>`
  DELETE FROM "PendingAction"
  WHERE "tokenHash" = ${hash}
  RETURNING
    "id",
    "tokenHash",
    "context",
    "expiresAt",
    "createdAt"
`

    return rows[0] ? pendingActionToDomain(rows[0]) : null
  }
}
