import { describe, expect, it } from 'vitest'
import { ClientSession } from './ClientSession'

const FUTURE = new Date(Date.now() + 60_000)
const PAST = new Date(Date.now() - 60_000)

const makeSession = (expiresAt = FUTURE): ClientSession =>
  ClientSession.create({
    id: 'session-id',
    clientId: 'client-id',
    expiresAt,
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    deviceName: 'test-device',
  })

describe('ClientSession', () => {
  describe('create()', () => {
    it('sets correct values', () => {
      const session = makeSession()

      expect(session.id).toBe('session-id')
      expect(session.clientId).toBe('client-id')
      expect(session.revokedAt).toBeNull()
      expect(session.userAgent).toBe('test-agent')
      expect(session.deviceName).toBe('test-device')
    })
  })

  describe('isActive()', () => {
    it('returns true for fresh session', () => {
      expect(makeSession().isActive()).toBe(true)
    })

    it('returns false after revoke()', () => {
      expect(makeSession().revoke().isActive()).toBe(false)
    })

    it('returns false when expired', () => {
      expect(makeSession(PAST).isActive()).toBe(false)
    })
  })

  describe('revoke()', () => {
    it('returns new instance with revokedAt set', () => {
      const session = makeSession()
      const revoked = session.revoke()

      expect(revoked.revokedAt).toBeInstanceOf(Date)
      expect(revoked.isRevoked()).toBe(true)
    })

    it('does not mutate original', () => {
      const session = makeSession()
      session.revoke()

      expect(session.revokedAt).toBeNull()
    })

    it('returns different instance', () => {
      const session = makeSession()
      expect(session.revoke()).not.toBe(session)
    })
  })

  describe('touch()', () => {
    it('returns new instance with updated lastUsedAt', () => {
      const session = makeSession()
      const before = session.lastUsedAt
      const touched = session.touch()

      expect(touched.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('does not mutate original', () => {
      const session = makeSession()
      const before = session.lastUsedAt
      session.touch()

      expect(session.lastUsedAt).toBe(before)
    })

    it('returns different instance', () => {
      const session = makeSession()
      expect(session.touch()).not.toBe(session)
    })

    it('preserves revokedAt', () => {
      const revoked = makeSession().revoke()
      const touched = revoked.touch()

      expect(touched.revokedAt).toBeInstanceOf(Date)
    })
  })

  describe('isExpired()', () => {
    it('returns false for future expiry', () => {
      expect(makeSession(FUTURE).isExpired()).toBe(false)
    })

    it('returns true for past expiry', () => {
      expect(makeSession(PAST).isExpired()).toBe(true)
    })
  })
})
