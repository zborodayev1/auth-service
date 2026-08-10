import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { JwtClientAccessTokenService } from './JwtClientAccessTokenService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import type { ServerConfig } from '@config/server/server'

const SECRET = 'test-secret-at-least-32-chars-long!!'

const config = {
  jwtSecret: SECRET,
  jwtExpiresInString: '1h',
} as unknown as ServerConfig

const makeService = (): JwtClientAccessTokenService => new JwtClientAccessTokenService(config)

describe('JwtClientAccessTokenService', () => {
  describe('sign() → verify()', () => {
    it('roundtrip returns correct payload', () => {
      const service = makeService()
      const token = service.sign('client-id', 'session-id')
      const payload = service.verify(token)

      expect(payload.clientId).toBe('client-id')
      expect(payload.sessionId).toBe('session-id')
    })
  })

  describe('verify()', () => {
    it('throws UnauthorizedError for wrong secret', () => {
      const service = makeService()
      const token = service.sign('client-id', 'session-id')

      const wrongConfig = {
        jwtSecret: 'wrong-secret-at-least-32-chars-!!',
        jwtExpiresInString: '1h',
      } as unknown as ServerConfig
      const wrongService = new JwtClientAccessTokenService(wrongConfig)

      expect(() => wrongService.verify(token)).toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError for expired token', () => {
      const service = makeService()
      const expiredToken = jwt.sign(
        { sub: 'client-id', sid: 'session-id', exp: Math.floor(Date.now() / 1000) - 100 },
        SECRET,
        { issuer: 'auth-system' },
      )

      expect(() => service.verify(expiredToken)).toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError for tampered token', () => {
      const service = makeService()
      const token = service.sign('client-id', 'session-id')
      const tampered = token.slice(0, -5) + 'XXXXX'

      expect(() => service.verify(tampered)).toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError for token with wrong issuer', () => {
      const service = makeService()
      const wrongIssuerToken = jwt.sign({ sub: 'client-id', sid: 'session-id' }, SECRET, {
        expiresIn: '1h',
        issuer: 'other-system',
      })

      expect(() => service.verify(wrongIssuerToken)).toThrow(UnauthorizedError)
    })
  })
})
