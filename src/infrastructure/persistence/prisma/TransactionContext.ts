import { Prisma, PrismaClient } from '@generated/prisma/client'
import { AsyncLocalStorage } from 'async_hooks'
import { injectable, inject } from 'inversify'
import { PrismaProvider } from './PrismaProvider'

@injectable()
export class TransactionContext {
  private storage = new AsyncLocalStorage<Prisma.TransactionClient>()
  private _testTx: Prisma.TransactionClient | null = null

  constructor(@inject(PrismaProvider) private readonly prisma: PrismaProvider) {}

  get client(): PrismaClient | Prisma.TransactionClient {
    return this.storage.getStore() ?? this._testTx ?? this.prisma
  }

  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined || this._testTx !== null
  }

  run<T>(tx: Prisma.TransactionClient, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, fn)
  }

  setTestTransaction(tx: Prisma.TransactionClient): void {
    this._testTx = tx
  }

  clearTestTransaction(): void {
    this._testTx = null
  }
}
