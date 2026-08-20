import { Container } from 'inversify'
import { Application } from './application'
import { PersistenceContext } from './contexts/infrastructure/PersistenceContext'
import { HttpContext } from './contexts/infrastructure/HttpContext'
import { AdaptersContext } from './contexts/infrastructure/AdaptersContext'
import { ClientContext } from './contexts/application/ClientContext'
import { UserContext } from './contexts/application/UserContext'
import { ProjectContext } from './contexts/application/ProjectContext'
import { ServiceContextBuilder } from './contexts/ServiceContextBuilder'

// test only comment
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Bootstrap {
  public static bootstrap(): Application {
    const container = new Container()

    new ServiceContextBuilder(container, [
      new PersistenceContext(),
      new AdaptersContext(),
      new HttpContext(),
      new ClientContext(),
      new UserContext(),
      new ProjectContext(),
    ]).build()

    container.bind(Application).toSelf()
    const app = container.get(Application)

    app.init()

    return app
  }
}

export const bootstrap = async (): Promise<void> => {
  try {
    const application = Bootstrap.bootstrap()
    await application.start()

    const shutdown = async (): Promise<void> => {
      await application.stop()
      process.exit(0)
    }

    process.on('SIGTERM', () => void shutdown())
    process.on('SIGINT', () => void shutdown())
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
