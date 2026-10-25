import { ValueObject } from '@libs/ddd/ValueObject'
import { VALIDATION_ERROR_CODES } from '@shared/errors/ErrorCodes'
import { ValidationError } from '@shared/errors/ValidationError'

export class Password extends ValueObject<Password> {
  private constructor(private readonly hash: string) {
    super()
  }

  static validateRaw(raw: string): void {
    if (!raw || raw.length < 8)
      throw new ValidationError(
        'Invalid password: must be at least 8 characters long',
        VALIDATION_ERROR_CODES.INVALID_INPUT,
        {
          minLength: 8,
          actualLength: raw.length,
        },
      )
    if (raw.length > 128)
      throw new ValidationError(
        'Invalid password: must not exceed 128 characters',
        VALIDATION_ERROR_CODES.INVALID_INPUT,
        {
          maxLength: 128,
          actualLength: raw.length,
        },
      )
  }

  static fromHash(hash: string): Password {
    if (!hash)
      throw new ValidationError('Invalid password hash', VALIDATION_ERROR_CODES.INVALID_INPUT)

    if (!/^\$2[aby]?\$/.test(hash))
      throw new ValidationError(
        'Invalid password hash format',
        VALIDATION_ERROR_CODES.INVALID_INPUT,
      )

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
