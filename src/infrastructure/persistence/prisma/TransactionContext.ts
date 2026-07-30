import { Prisma, PrismaClient } from '@generated/prisma/client'
import { AsyncLocalStorage } from 'async_hooks'
import { injectable } from 'inversify'
import { PrismaProvider } from './PrismaProvider'

@injectable()
export class TransactionContext {
  private storage = new AsyncLocalStorage<Prisma.TransactionClient>()

  constructor(private readonly prisma: PrismaProvider) {}

  get client(): PrismaClient | Prisma.TransactionClient {
    return this.storage.getStore() ?? this.prisma
  }

  isInTransaction(): boolean {
    return this.storage.getStore() !== undefined
  }

  run<T>(tx: Prisma.TransactionClient, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, fn)
  }
}
