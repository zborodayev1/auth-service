import { describe, expect, it } from 'vitest'
import { Name } from './Name'
import { ValidationError } from '@shared/errors/ValidationError'

describe('Name', () => {
  describe('create', () => {
    it('creates a valid name', () => {
      const name = Name.create('validrandomname')

      expect(name.getValue()).toBe('validrandomname')
    })

    it('trims whitespace', () => {
      const name = Name.create('  validrandomname  ')

      expect(name.getValue()).toBe('validrandomname')
    })

    it('throws for name shorter than 8 chars', () => {
      expect(() => Name.create('name')).toThrow(ValidationError)
    })

    it('throws for name longer than 64 chars', () => {
      expect(() => Name.create('a'.repeat(65))).toThrow(ValidationError)
    })

    it('accepts name of exactly 8 chars', () => {
      expect(() => Name.create('a'.repeat(8))).not.toThrow()
    })

    it('accepts name of exactly 64 chars', () => {
      expect(() => Name.create('a'.repeat(64))).not.toThrow()
    })

    it('throws for invalid name', () => {
      expect(() => Name.create('John@Doe')).toThrow(ValidationError)
    })
  })
})
