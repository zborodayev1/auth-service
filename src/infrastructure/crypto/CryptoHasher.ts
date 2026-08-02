import type { Hasher } from '@ports/Hasher'
import { createHash } from 'crypto'
import type { BinaryToTextEncoding } from 'crypto'
import { injectable, unmanaged } from 'inversify'

@injectable()
export class CryptoHasher implements Hasher {
  constructor(
    @unmanaged() private readonly algorithm = 'sha256',
    @unmanaged() private readonly encoding: BinaryToTextEncoding = 'hex',
  ) {}
  hash(value: string): string {
    return createHash(this.algorithm).update(value).digest(this.encoding)
  }
}
