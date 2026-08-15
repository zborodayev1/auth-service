import { describe, expect, it, vi, type Mock } from 'vitest'
import { ClientRefreshTokenService } from './ClientRefreshTokenService'
import { ClientRefreshToken } from '@aggregates/clientRefreshToken/RefreshToken'
import type { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import type { ClientRefreshTokenFactory } from '@factories/ClientRefreshTokenFactory'
import type { UnitOfWork } from '@ports/UnitOfWork'
import type { Hasher } from '@ports/Hasher'
import type { KeyGenerator } from '@ports/KeyGenerator'
import type { ServerConfig } from '@config/server/server'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

const FUTURE = new Date(Date.now() + 60_000)
const PAST = new Date(0)

const makeToken = (overrides?: {
  usedAt?: Date | null
  revokedAt?: Date | null
  expiresAt?: Date
}): ClientRefreshToken =>
  ClientRefreshToken.reconstruct(
    'token-1',
    'session-1',
    'h:raw',
    overrides?.usedAt ?? null,
    overrides?.revokedAt ?? null,
    overrides?.expiresAt ?? FUTURE,
    new Date(),
  )

interface MockRepo { findByHash: Mock; revokeAllBySessionId: Mock; save: Mock }

const makeRepo = (token: ClientRefreshToken | null = null): MockRepo => ({
  findByHash: vi.fn().mockResolvedValue(token),
  revokeAllBySessionId: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
})

const makeUoW = (): UnitOfWork => ({
  execute: vi.fn((fn: () => Promise<unknown>) => fn()) as unknown as UnitOfWork['execute'],
})
const makeHasher = (): Hasher => ({ hash: (s: string): string => `h:${s}` })
const makeKeyGen = (): KeyGenerator => ({ generate: (): string => 'raw' })
const makeConfig = (): ServerConfig => ({ refreshTokenTtlMs: 60_000 } as ServerConfig)
const makeFactory = (): ClientRefreshTokenFactory =>
  ({
    create: vi.fn(() =>
      ClientRefreshToken.create({ id: 'new-token', sessionId: 'session-1', hash: 'h:raw', expiresAt: FUTURE }),
    ),
  }) as unknown as ClientRefreshTokenFactory

const makeService = (repo: MockRepo = makeRepo()): ClientRefreshTokenService =>
  new ClientRefreshTokenService(makeUoW(), repo as unknown as ClientRefreshTokenRepository, makeFactory(), makeHasher(), makeConfig(), makeKeyGen())

describe('ClientRefreshTokenService', () => {
  describe('requireValid()', () => {
    it('throws REFRESH_TOKEN_INVALID when token not found', async () => {
      const svc = makeService(makeRepo(null))
      const err = await svc.requireValid('raw').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_INVALID')
    })

    it('throws REFRESH_TOKEN_EXPIRED when token is expired', async () => {
      const svc = makeService(makeRepo(makeToken({ expiresAt: PAST })))
      const err = await svc.requireValid('raw').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_EXPIRED')
    })

    it('throws REFRESH_TOKEN_REVOKED when token is revoked', async () => {
      const svc = makeService(makeRepo(makeToken({ revokedAt: new Date() })))
      const err = await svc.requireValid('raw').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_REVOKED')
    })

    it('returns token when valid', async () => {
      const token = makeToken()
      const svc = makeService(makeRepo(token))
      await expect(svc.requireValid('raw')).resolves.toBe(token)
    })
  })

  describe('detectReuse()', () => {
    it('resolves without throw when token not used', async () => {
      const svc = makeService()
      await expect(svc.detectReuse(makeToken())).resolves.toBeUndefined()
    })

    it('revokes all by sessionId and throws REFRESH_TOKEN_REUSE_DETECTED when used', async () => {
      const repo = makeRepo(makeToken({ usedAt: new Date() }))
      const svc = makeService(repo)
      const usedToken = makeToken({ usedAt: new Date() })
      const err = await svc.detectReuse(usedToken).catch((e: unknown) => e)
      expect(repo.revokeAllBySessionId).toHaveBeenCalledWith(usedToken.sessionId)
      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).reason).toBe('REFRESH_TOKEN_REUSE_DETECTED')
    })
  })

  describe('generate()', () => {
    it('returns rawRefreshToken, hash, and future expiresAt', () => {
      const svc = makeService()
      const result = svc.generate()
      expect(result.rawRefreshToken).toBe('raw')
      expect(result.hash).toBe('h:raw')
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('rotate()', () => {
    it('returns a GeneratedRefreshToken with rawRefreshToken and hash', async () => {
      const svc = makeService()
      const result = await svc.rotate(makeToken())
      expect(result.rawRefreshToken).toBe('raw')
      expect(result.hash).toBe('h:raw')
    })
  })
})
