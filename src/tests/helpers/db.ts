import type { Container } from 'inversify'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { ServerConfig } from '@config/server/server'

export async function truncateAll(container: Container): Promise<void> {
  const config = container.get(ServerConfig)
  if (!config.isTest) {
    throw new Error(`truncateAll refused: NODE_ENV is not 'test'. Current: ${config.environment}`)
  }

  const prisma = container.get(PrismaProvider)

  // users first (reference project)
  await prisma.userFieldValue.deleteMany()
  await prisma.userRefreshToken.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.user.deleteMany()

  // projects (reference client via ownerId)
  await prisma.apiKey.deleteMany()
  await prisma.projectField.deleteMany()
  await prisma.project.deleteMany()

  // clients last
  await prisma.refreshToken.deleteMany()
  await prisma.session.deleteMany()
  await prisma.client.deleteMany()
}
