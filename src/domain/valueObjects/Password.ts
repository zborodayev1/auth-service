import { ValueObject } from '@libs/ddd/ValueObject'
import { ValidationError } from '@shared/errors/ValidationError'

export class Password extends ValueObject<Password> {
  private constructor(private readonly hash: string) {
    super()
  }

  static validateRaw(raw: string): void {
    if (!raw || raw.length < 8)
      throw new ValidationError(
        'Invalid password: must be at least 8 characters long',
        'INVALID_PASSWORD_LENGTH',
        {
          minLength: 8,
          actualLength: raw.length,
        },
      )
    if (raw.length > 128)
      throw new ValidationError(
        'Invalid password: must not exceed 128 characters',
        'INVALID_PASSWORD_LENGTH',
        {
          maxLength: 128,
          actualLength: raw.length,
        },
      )
  }

  static fromHash(hash: string): Password {
    if (!hash) throw new ValidationError('Invalid password hash', 'INVALID_PASSWORD_HASH')

    if (!/^\$2[aby]?\$/.test(hash))
      throw new ValidationError('Invalid password hash format', 'INVALID_PASSWORD_HASH_FORMAT')

    return new Password(hash)
  }

  getHash(): string {
    return this.hash
  }

  copy(): Password {
    return new Password(this.hash)
  }

  override toString(): string {
    return '[REDACTED]'
  }
}
