import { ValueObject } from '@libs/ddd/ValueObject'
import { ValidationError } from '@shared/errors/ValidationError'

export class Email extends ValueObject<Email> {
  private constructor(private readonly value: string) {
    super()
  }

  static create(raw: string): Email {
    const trimmed = raw.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new ValidationError('Invalid email format', 'INVALID_EMAIL_FORMAT', {
        email: trimmed,
      })
    }
    return new Email(trimmed)
  }

  copy(): Email {
    return new Email(this.value)
  }

  override toString(): string {
    return this.value
  }
}
