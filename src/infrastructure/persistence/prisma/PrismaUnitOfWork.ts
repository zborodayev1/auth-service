import { UnitOfWork } from '@ports/UnitOfWork'
import { injectable, inject } from 'inversify'
import { PrismaProvider } from './PrismaProvider'
import { TransactionContext } from './TransactionContext'

@injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    @inject(PrismaProvider) private readonly prisma: PrismaProvider,
    @inject(TransactionContext) private readonly ctx: TransactionContext,
  ) {}

  execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.ctx.isInTransaction()) {
      return fn()
    }
    return this.prisma.$transaction((tx) => this.ctx.run(tx, fn))
  }
}
