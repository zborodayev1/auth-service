import { describe, expect, it } from 'vitest'
import { ClientRefreshToken } from './RefreshToken'

const FUTURE = new Date(Date.now() + 60_000)
const PAST = new Date(Date.now() - 60_000)

const makeToken = (expiresAt = FUTURE): ClientRefreshToken =>
  ClientRefreshToken.create({ id: 'token-id', sessionId: 'session-id', hash: 'hash', expiresAt })

describe('ClientRefreshToken', () => {
  describe('create()', () => {
    it('sets correct values', () => {
      const token = makeToken()

      expect(token.id).toBe('token-id')
      expect(token.sessionId).toBe('session-id')
      expect(token.hash).toBe('hash')
      expect(token.usedAt).toBeNull()
      expect(token.revokedAt).toBeNull()
    })
  })

  describe('isActive()', () => {
    it('returns true for fresh token', () => {
      expect(makeToken().isActive()).toBe(true)
    })

    it('returns false after markAsUsed()', () => {
      expect(makeToken().markAsUsed().isActive()).toBe(false)
    })

    it('returns false after revoke()', () => {
      expect(makeToken().revoke().isActive()).toBe(false)
    })

    it('returns false when expired', () => {
      expect(makeToken(PAST).isActive()).toBe(false)
    })
  })

  describe('markAsUsed()', () => {
    it('returns new instance with usedAt set', () => {
      const token = makeToken()
      const used = token.markAsUsed()

      expect(used.usedAt).toBeInstanceOf(Date)
      expect(used.isUsed()).toBe(true)
    })

    it('does not mutate original', () => {
      const token = makeToken()
      token.markAsUsed()

      expect(token.usedAt).toBeNull()
    })

    it('returns different instance', () => {
      const token = makeToken()
      expect(token.markAsUsed()).not.toBe(token)
    })
  })

  describe('revoke()', () => {
    it('returns new instance with revokedAt set', () => {
      const token = makeToken()
      const revoked = token.revoke()

      expect(revoked.revokedAt).toBeInstanceOf(Date)
      expect(revoked.isRevoked()).toBe(true)
    })

    it('does not mutate original', () => {
      const token = makeToken()
      token.revoke()

      expect(token.revokedAt).toBeNull()
    })

    it('returns different instance', () => {
      const token = makeToken()
      expect(token.revoke()).not.toBe(token)
    })
  })

  describe('isExpired()', () => {
    it('returns false for future expiry', () => {
      expect(makeToken(FUTURE).isExpired()).toBe(false)
    })

    it('returns true for past expiry', () => {
      expect(makeToken(PAST).isExpired()).toBe(true)
    })
  })
})
