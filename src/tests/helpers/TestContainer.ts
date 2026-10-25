import type { Express } from 'express'
import { Container } from 'inversify'

import { ExpressApp } from '@infra/http/ExpressApp'

import { PersistenceContext } from '../../contexts/infrastructure/PersistenceContext'
import { AdaptersContext } from '../../contexts/infrastructure/AdaptersContext'
import { ClientContext } from '../../contexts/application/ClientContext'
import { UserContext } from '../../contexts/application/UserContext'
import { ProjectContext } from '../../contexts/application/ProjectContext'
import { HttpContext } from '../../contexts/infrastructure/HttpContext'
import { ServiceContextBuilder } from '../../contexts/ServiceContextBuilder'

export class TestContainer {
  readonly container: Container

  constructor() {
    this.container = new Container()

    const contexts = [
      new PersistenceContext(),
      new AdaptersContext(),
      new ClientContext(),
      new UserContext(),
      new ProjectContext(),
      new HttpContext(),
    ]

    new ServiceContextBuilder(this.container, contexts).build()
  }

  get app(): Express {
    return this.container.get(ExpressApp).getInstance()
  }
}
