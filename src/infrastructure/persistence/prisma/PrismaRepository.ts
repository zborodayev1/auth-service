import type { TransactionContext } from './TransactionContext'
import { PrismaClient, type Prisma } from '@generated/prisma/client'

export abstract class PrismaRepository {
  constructor(protected readonly ctx: TransactionContext) {}

  protected get prismaClient(): PrismaClient | Prisma.TransactionClient {
    return this.ctx.client
  }

  protected withAtomicOps<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const client = this.prismaClient
    if (client instanceof PrismaClient) {
      return client.$transaction(fn)
    }
    return fn(client)
  }
}
