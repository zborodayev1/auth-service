import type { Container } from 'inversify'
import type { PrismaClient, Prisma } from '@generated/prisma/client'
import { TransactionContext } from '@infra/persistence/prisma/TransactionContext'

export function getDbClient(container: Container): PrismaClient | Prisma.TransactionClient {
  return container.get(TransactionContext).client
}
