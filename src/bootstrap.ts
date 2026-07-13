import 'reflect-metadata'
import { Container } from 'inversify'
import { Application } from './application'
import { ApplicationContext } from './contexts/ApplicationContext'
import { InfrastructureContext } from './contexts/InfrastructureContex'
import { ServiceContextBuilder } from './contexts/ServiceContextBuilder'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Bootstrap {
  public static bootstrap(): Application {
    const container = new Container()

    new ServiceContextBuilder(container, [
      new ApplicationContext(),
      new InfrastructureContext(),
    ]).build()

    const app = container.get(Application)

    app.init()

    return app
  }
}

export const bootstrap = async (): Promise<void> => {
  try {
    const application = Bootstrap.bootstrap()
    await application.start()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
