import type { Container } from 'inversify'
import type { ServiceContext } from './ServiceContext'

export class ServiceContextBuilder {
  constructor(
    private readonly container: Container,
    private readonly contexts: ServiceContext[],
  ) {}

  build(): void {
    for (const context of this.contexts) {
      context.register(this.container)
    }
  }
}
