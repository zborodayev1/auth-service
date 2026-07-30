import { UnitOfWork } from '@ports/UnitOfWork'
import { injectable } from 'inversify'
import { PrismaProvider } from './PrismaProvider'
import { TransactionContext } from './TransactionContext'

@injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaProvider,
    private readonly ctx: TransactionContext,
  ) {}

  execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.ctx.isInTransaction()) {
      return fn()
    }
    return this.prisma.$transaction((tx) => this.ctx.run(tx, fn))
  }
}
