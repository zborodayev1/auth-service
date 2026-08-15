import { Container } from 'inversify'
import { ServiceContextBuilder } from '../../contexts/ServiceContextBuilder'
import { PersistenceContext } from '../../contexts/infrastructure/PersistenceContext'
import { AdaptersContext } from '../../contexts/infrastructure/AdaptersContext'
import { HttpContext } from '../../contexts/infrastructure/HttpContext'
import { ClientContext } from '../../contexts/application/ClientContext'
import { UserContext } from '../../contexts/application/UserContext'
import { ProjectContext } from '../../contexts/application/ProjectContext'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { ExpressApp } from '@infra/http/ExpressApp'
import type { Express } from 'express'

let _httpContainer: Container | null = null

export function getHttpTestContainer(): Container {
  if (_httpContainer) return _httpContainer

  _httpContainer = new Container()

  new ServiceContextBuilder(_httpContainer, [
    new PersistenceContext(),
    new AdaptersContext(),
    new HttpContext(),
    new ClientContext(),
    new UserContext(),
    new ProjectContext(),
  ]).build()

  return _httpContainer
}

export function getTestApp(): Express {
  return getHttpTestContainer().get(ExpressApp).getInstance()
}

export async function disconnectHttpTestDb(): Promise<void> {
  if (!_httpContainer) return
  const prisma = _httpContainer.get(PrismaProvider)
  _httpContainer = null
  await prisma.$disconnect()
}
