import type { Container } from 'inversify'

export interface ServiceContext {
  register(container: Container): void
}
