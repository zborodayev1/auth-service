import { describe, expect, it } from 'vitest'
import { User } from './User'
import { Email } from '@valueObjects/Email/Email'
import { Password } from '@valueObjects/Password/Password'

const makeUser = (): User =>
  User.create({
    id: 'user-id',
    projectId: 'project-id',
    email: Email.create('user@example.com'),
    password: Password.fromHash('$2b$12$somehashvalue'),
  })

describe('User', () => {
  describe('create()', () => {
    it('returns User with correct values', () => {
      const user = makeUser()

      expect(user.id).toBe('user-id')
      expect(user.projectId).toBe('project-id')
      expect(user.email.toString()).toBe('user@example.com')
    })
  })

  describe('changeEmail()', () => {
    it('returns new instance with updated email', () => {
      const user = makeUser()
      const updated = user.changeEmail(Email.create('new@example.com'))

      expect(updated.email.toString()).toBe('new@example.com')
    })

    it('does not mutate original', () => {
      const user = makeUser()
      user.changeEmail(Email.create('new@example.com'))

      expect(user.email.toString()).toBe('user@example.com')
    })

    it('returns different instance', () => {
      const user = makeUser()
      const updated = user.changeEmail(Email.create('new@example.com'))

      expect(updated).not.toBe(user)
    })

    it('preserves projectId', () => {
      const user = makeUser()
      const updated = user.changeEmail(Email.create('new@example.com'))

      expect(updated.projectId).toBe(user.projectId)
    })
  })

  describe('changePassword()', () => {
    it('returns new instance with updated password', () => {
      const user = makeUser()
      const newHash = '$2b$12$newhashvalue'
      const updated = user.changePassword(Password.fromHash(newHash))

      expect(updated.password.getHash()).toBe(newHash)
    })

    it('does not mutate original', () => {
      const user = makeUser()
      const originalHash = user.password.getHash()
      user.changePassword(Password.fromHash('$2b$12$newhashvalue'))

      expect(user.password.getHash()).toBe(originalHash)
    })

    it('returns different instance', () => {
      const user = makeUser()
      const updated = user.changePassword(Password.fromHash('$2b$12$newhashvalue'))

      expect(updated).not.toBe(user)
    })
  })
})
