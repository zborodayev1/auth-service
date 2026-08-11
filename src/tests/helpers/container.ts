import { Container } from 'inversify'
import { ServerConfig } from '@config/server/server'
import { PersistenceContext } from '../../contexts/infrastructure/PersistenceContext'
import { AdaptersContext } from '../../contexts/infrastructure/AdaptersContext'
import { ClientContext } from '../../contexts/application/ClientContext'
import { UserContext } from '../../contexts/application/UserContext'
import { ProjectContext } from '../../contexts/application/ProjectContext'
import { ServiceContextBuilder } from '../../contexts/ServiceContextBuilder'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'

let _container: Container | null = null

export function getTestContainer(): Container {
  if (_container) return _container

  _container = new Container()
  _container.bind(ServerConfig).toSelf().inSingletonScope()

  new ServiceContextBuilder(_container, [
    new PersistenceContext(),
    new AdaptersContext(),
    new ClientContext(),
    new UserContext(),
    new ProjectContext(),
  ]).build()

  return _container
}

// _container is reset to null by disconnectTestDb() after each file's afterAll.
// Next file gets a fresh container with a new Prisma connection.
// Do NOT enable fileParallelism without replacing this with a per-file factory.
export async function disconnectTestDb(): Promise<void> {
  if (!_container) return
  const prisma = _container.get(PrismaProvider)
  _container = null
  await prisma.$disconnect()
}
