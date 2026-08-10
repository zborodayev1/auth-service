import { describe, expect, it } from 'vitest'
import { Email } from './Email'
import { ValidationError } from '@shared/errors/ValidationError'

describe('Email', () => {
  describe('create', () => {
    it('returns Email for valid input', () => {
      const email = Email.create('user@gmail.com')

      expect(email.toString()).toBe('user@gmail.com')
    })

    it('trims whitespace', () => {
      const email = Email.create(' user@gmail.com  ')

      expect(email.toString()).toBe('user@gmail.com')
    })

    it('converts email to lowercase', () => {
      const email = Email.create('USER@gmail.com')

      expect(email.toString()).toBe('user@gmail.com')
    })

    it('throws for email without @', () => {
      expect(() => Email.create('usergmail.com')).toThrow(ValidationError)
    })

    it('throws for email without domain', () => {
      expect(() => Email.create('user@')).toThrow(ValidationError)
    })

    it('throws for email without domain extension', () => {
      expect(() => Email.create('user@gmail')).toThrow(ValidationError)
    })

    it('throws for empty email', () => {
      expect(() => Email.create('')).toThrow(ValidationError)
    })

    it('throws for whitespace-only input', () => {
      expect(() => Email.create('   ')).toThrow(ValidationError)
    })
  })
})
