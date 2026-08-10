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

export async function disconnectTestDb(): Promise<void> {
  if (!_container) return
  const prisma = _container.get(PrismaProvider)
  await prisma.$disconnect()
  _container = null
}
