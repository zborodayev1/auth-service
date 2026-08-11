import { describe, expect, it } from 'vitest'
import { Password } from './Password'
import { ValidationError } from '@shared/errors/ValidationError'

describe('Password', () => {
  describe('validateRaw', () => {
    it('throws for password shorter than 8 chars', () => {
      expect(() => {
        Password.validateRaw('abc')
      }).toThrow(ValidationError)
    })

    it('throws for empty password', () => {
      expect(() => {
        Password.validateRaw('')
      }).toThrow(ValidationError)
    })

    it('throws for password longer than 128 chars', () => {
      expect(() => {
        Password.validateRaw('a'.repeat(129))
      }).toThrow(ValidationError)
    })
  })

  describe('fromHash', () => {
    it('throws for null hash', () => {
      expect(() => {
        Password.fromHash('')
      }).toThrow(ValidationError)
    })

    it('throws for invalid hash', () => {
      expect(() => {
        Password.fromHash('some-random-string')
      }).toThrow(ValidationError)
    })
  })

  describe('toString', () => {
    it('returns [REDACTED]', () => {
      const password = Password.fromHash('$2b$12$test')
      expect(password.toString()).toBe('[REDACTED]')
    })
  })
})
