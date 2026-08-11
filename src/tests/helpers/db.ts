import type { Container } from 'inversify'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { ServerConfig } from '@config/server/server'
import { Prisma } from '@generated/prisma/client'

export async function truncateAll(container: Container): Promise<void> {
  const config = container.get(ServerConfig)
  if (!config.isTest) {
    throw new Error(`truncateAll refused: NODE_ENV is not 'test'. Current: ${config.environment}`)
  }

  const covered = new Set([
    'userFieldValue',
    'userRefreshToken',
    'userSession',
    'user',
    'apiKey',
    'projectField',
    'project',
    'refreshToken',
    'session',
    'client',
  ])

  const schemaModels = Object.values(Prisma.ModelName).map(
    (name) => name.charAt(0).toLowerCase() + name.slice(1),
  )

  const missing = schemaModels.filter((m) => !covered.has(m))
  if (missing.length > 0) {
    throw new Error(`truncateAll out of sync with schema. Add or exclude: ${missing.join(', ')}`)
  }

  const prisma = container.get(PrismaProvider)

  // KEEP IN SYNC with prisma/schema.prisma — add new models here or data leaks between tests.
  await prisma.$transaction([
    prisma.userFieldValue.deleteMany(),
    prisma.userRefreshToken.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.user.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.projectField.deleteMany(),
    prisma.project.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.client.deleteMany(),
  ])
}
