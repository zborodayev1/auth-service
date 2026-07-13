import type { KeyGenerator } from '@ports/KeyGenerator'
import { randomBytes } from 'crypto'
import { injectable } from 'inversify'

@injectable()
export class CryptoKeyGenerator implements KeyGenerator {
  generate(bytes = 32, encoding: BufferEncoding = 'hex'): string {
    return randomBytes(bytes).toString(encoding)
  }
}
