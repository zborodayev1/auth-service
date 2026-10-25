import { ValidationError } from '@shared/errors/ValidationError'
import { NameVO } from '@libs/ddd/VO/NameVO'
import { VALIDATION_ERROR_CODES } from '@shared/errors/ErrorCodes'

export class Name extends NameVO<Name> {
  private constructor(value: string) {
    super(value)
  }

  static create(name: string): Name {
    const trimmed = name.trim()

    if (trimmed.length < 8 || trimmed.length > 64) {
      throw new ValidationError(
        'Invalid name: must be 8-64 characters long',
        VALIDATION_ERROR_CODES.INVALID_INPUT,
        {
          minLength: 8,
          maxLength: 64,
          actualLength: trimmed.length,
        },
      )
    }

    if (!/^[\p{L}\p{N} '_-]+$/u.test(trimmed)) {
      throw new ValidationError(
        'Invalid name: contains forbidden characters',
        VALIDATION_ERROR_CODES.INVALID_INPUT,
        {
          forbiddenCharacters: trimmed.match(/[^\p{L}\p{N} '_-]/gu),
          name: trimmed,
        },
      )
    }

    return new Name(trimmed)
  }
}
