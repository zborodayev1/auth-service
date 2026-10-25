import type { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import type { TransactionContext } from '@infra/persistence/prisma/TransactionContext'

class TestRollback extends Error {
  constructor() {
    super('Test transaction rollback')
    this.name = 'TestRollback'
  }
}

export class TestTransaction {
  constructor(
    private readonly prisma: PrismaProvider,
    private readonly context: TransactionContext,
    private readonly schema: string,
  ) {}

  async rollback<T>(fn: () => Promise<T>): Promise<T> {
    let result!: T

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET search_path TO "${this.schema}"`)
        result = await this.context.run(tx, fn)

        throw new TestRollback()
      })
    } catch (error) {
      if (error instanceof TestRollback) {
        return result
      }

      throw error
    }
    return result
  }
}
