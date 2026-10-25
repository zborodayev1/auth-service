import type { IdGenerator } from '@ports/IdGenerator'
import { v4 as uuid } from 'uuid'
import { injectable } from 'inversify'

@injectable()
export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return uuid()
  }
}
