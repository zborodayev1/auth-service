import { ApiKey } from '@aggregates/project/ApiKey'
import { Hasher } from '@ports/Hasher'
import { IdGenerator } from '@ports/IdGenerator'
import { KeyGenerator } from '@ports/KeyGenerator'
import { Name } from '@valueObjects/Name'
import { timingSafeEqual } from 'crypto'
import { inject, injectable } from 'inversify'

@injectable()
export class ApiKeyService {
  constructor(
    @inject(IdGenerator) private readonly idGenerator: IdGenerator,
    @inject(Hasher) private readonly hasher: Hasher,
    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
  ) {}

  create(name: Name): { apiKey: ApiKey; rawKey: string } {
    const rawKey = this.keyGenerator.generate()
    const hash = this.hasher.hash(rawKey)
    return {
      apiKey: new ApiKey(this.idGenerator.generate(), name, hash, false, new Date()),
      rawKey,
    }
  }

  verify(rawKey: string, hash: string): boolean {
    const computed = this.hasher.hash(rawKey)
    if (computed.length !== hash.length) return false
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  }
}
