import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { JwtUserAccessTokenService } from './JwtUserAccessTokenService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import type { ServerConfig } from '@config/server/server'

const PROJECT_SECRET = 'project-jwt-secret-at-least-32chars!'

const config = {
  jwtExpiresInString: '1h',
} as unknown as ServerConfig

const makeService = (): JwtUserAccessTokenService => new JwtUserAccessTokenService(config)

describe('JwtUserAccessTokenService', () => {
  describe('sign() → verify()', () => {
    it('roundtrip returns correct payload', () => {
      const service = makeService()
      const token = service.sign('user-id', 'project-id', 'session-id', PROJECT_SECRET)
      const payload = service.verify(token, PROJECT_SECRET)

      expect(payload.userId).toBe('user-id')
      expect(payload.projectId).toBe('project-id')
      expect(payload.sessionId).toBe('session-id')
    })
  })

  describe('verify()', () => {
    it('throws UnauthorizedError for wrong secret', () => {
      const service = makeService()
      const token = service.sign('user-id', 'project-id', 'session-id', PROJECT_SECRET)

      expect(() => service.verify(token, 'wrong-secret-at-least-32-chars-!!')).toThrow(
        UnauthorizedError,
      )
    })

    it('throws UnauthorizedError for expired token', () => {
      const service = makeService()
      const expiredToken = jwt.sign(
        {
          sub: 'user-id',
          pid: 'project-id',
          sid: 'session-id',
          type: 'user',
          exp: Math.floor(Date.now() / 1000) - 100,
        },
        PROJECT_SECRET,
        { issuer: 'auth-system' },
      )

      expect(() => service.verify(expiredToken, PROJECT_SECRET)).toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError for tampered token', () => {
      const service = makeService()
      const token = service.sign('user-id', 'project-id', 'session-id', PROJECT_SECRET)
      const tampered = token.slice(0, -5) + 'XXXXX'

      expect(() => service.verify(tampered, PROJECT_SECRET)).toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError for token with wrong issuer', () => {
      const service = makeService()
      const wrongIssuerToken = jwt.sign(
        { sub: 'user-id', pid: 'project-id', sid: 'session-id', type: 'user' },
        PROJECT_SECRET,
        { expiresIn: '1h', issuer: 'other-system' },
      )

      expect(() => service.verify(wrongIssuerToken, PROJECT_SECRET)).toThrow(UnauthorizedError)
    })
  })

  describe('decodeUnverified()', () => {
    it('returns projectId from valid token without verifying signature', () => {
      const service = makeService()
      const token = service.sign('user-id', 'project-id', 'session-id', PROJECT_SECRET)
      const result = service.decodeUnverified(token)

      expect(result?.projectId).toBe('project-id')
    })

    it('returns null for malformed token', () => {
      const service = makeService()
      const result = service.decodeUnverified('not.a.token')

      expect(result).toBeNull()
    })
  })
})
