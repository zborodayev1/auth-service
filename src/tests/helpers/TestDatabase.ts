import type { PrismaClient } from '@generated/prisma/client'
import { type Prisma } from '@generated/prisma/client'
import type { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import type { TransactionContext } from '@infra/persistence/prisma/TransactionContext'

export class TestDatabase {
  constructor(
    private readonly prisma: PrismaProvider,
    private readonly transactionContext: TransactionContext,
  ) {}

  get client(): PrismaClient | Prisma.TransactionClient {
    return this.transactionContext.client
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}
