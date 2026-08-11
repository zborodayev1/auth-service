import { describe, expect, it } from 'vitest'
import { UserSession } from './UserSession'

const FUTURE = new Date(Date.now() + 60_000)
const PAST = new Date(Date.now() - 60_000)

const makeSession = (expiresAt = FUTURE): UserSession =>
  UserSession.create({
    id: 'session-id',
    userId: 'user-id',
    projectId: 'project-id',
    expiresAt,
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    deviceName: 'test-device',
  })

describe('UserSession', () => {
  describe('create()', () => {
    it('sets correct values', () => {
      const session = makeSession()

      expect(session.id).toBe('session-id')
      expect(session.userId).toBe('user-id')
      expect(session.projectId).toBe('project-id')
      expect(session.revokedAt).toBeNull()
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

    it('preserves projectId', () => {
      const session = makeSession()
      expect(session.revoke().projectId).toBe('project-id')
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
