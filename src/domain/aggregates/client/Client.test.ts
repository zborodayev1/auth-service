import { describe, expect, it } from 'vitest'
import { Client } from './Client'
import { Email } from '@valueObjects/Email/Email'
import { Name } from '@valueObjects/Name/Name'
import { Password } from '@valueObjects/Password/Password'

const makeClient = (): Client =>
  Client.create(
    'client-id',
    Name.create('validclient'),
    Email.create('user@example.com'),
    Password.fromHash('$2b$12$somehashvalue'),
  )

describe('Client', () => {
  describe('create()', () => {
    it('returns Client with correct values', () => {
      const client = makeClient()

      expect(client.id).toBe('client-id')
      expect(client.name).toBe('validclient')
      expect(client.email.toString()).toBe('user@example.com')
    })
  })

  describe('reName()', () => {
    it('returns new instance with updated name', () => {
      const client = makeClient()
      const renamed = client.reName(Name.create('updatedname1'))

      expect(renamed.name).toBe('updatedname1')
    })

    it('does not mutate original', () => {
      const client = makeClient()
      client.reName(Name.create('updatedname1'))

      expect(client.name).toBe('validclient')
    })

    it('returns different instance', () => {
      const client = makeClient()
      const renamed = client.reName(Name.create('updatedname1'))

      expect(renamed).not.toBe(client)
    })
  })

  describe('changeEmail()', () => {
    it('returns new instance with updated email', () => {
      const client = makeClient()
      const updated = client.changeEmail(Email.create('new@example.com'))

      expect(updated.email.toString()).toBe('new@example.com')
    })

    it('does not mutate original', () => {
      const client = makeClient()
      client.changeEmail(Email.create('new@example.com'))

      expect(client.email.toString()).toBe('user@example.com')
    })

    it('returns different instance', () => {
      const client = makeClient()
      const updated = client.changeEmail(Email.create('new@example.com'))

      expect(updated).not.toBe(client)
    })
  })

  describe('changePassword()', () => {
    it('returns new instance with updated password', () => {
      const client = makeClient()
      const newHash = '$2b$12$newhashvalue'
      const updated = client.changePassword(Password.fromHash(newHash))

      expect(updated.password.getHash()).toBe(newHash)
    })

    it('does not mutate original', () => {
      const client = makeClient()
      const originalHash = client.password.getHash()
      client.changePassword(Password.fromHash('$2b$12$newhashvalue'))

      expect(client.password.getHash()).toBe(originalHash)
    })

    it('returns different instance', () => {
      const client = makeClient()
      const updated = client.changePassword(Password.fromHash('$2b$12$newhashvalue'))

      expect(updated).not.toBe(client)
    })
  })
})
