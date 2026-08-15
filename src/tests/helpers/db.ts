import { beforeEach, afterEach } from 'vitest'
import type { Container } from 'inversify'
import { PrismaClient, type Prisma } from '@generated/prisma/client'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { TransactionContext } from '@infra/persistence/prisma/TransactionContext'

export function getDbClient(container: Container): PrismaClient | Prisma.TransactionClient {
  return container.get(TransactionContext).client
}

export function useTransactionIsolation(container: Container): void {
  const ctx = container.get(TransactionContext)
  const prisma = container.get(PrismaProvider)
  let triggerRollback: ((err: Error) => void) | null = null

  beforeEach(async () => {
    await new Promise<void>((setupDone) => {
      prisma
        .$transaction(
          async (tx) => {
            ctx.setTestTransaction(tx)
            setupDone()
            await new Promise<void>((_, rej) => {
              triggerRollback = rej
            })
          },
          { timeout: 30000 },
        )
        .catch(() => {})
    })
  })

  afterEach(() => {
    ctx.clearTestTransaction()
    triggerRollback?.(new Error('rollback'))
    triggerRollback = null
  })
}
