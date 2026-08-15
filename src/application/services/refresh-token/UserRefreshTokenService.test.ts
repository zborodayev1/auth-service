import { describe, expect, it, vi, type Mock } from 'vitest'
import { UserRefreshTokenService } from './UserRefreshTokenService'
import { UserRefreshToken } from '@aggregates/userRefreshToken/UserRefreshToken'
import type { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import type { UserRefreshTokenFactory } from '@factories/UserRefreshTokenFactory'
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
}): UserRefreshToken =>
  UserRefreshToken.reconstruct(
    'token-1',
    'session-1',
    'h:raw',
    overrides?.usedAt ?? null,
    overrides?.revokedAt ?? null,
    overrides?.expiresAt ?? FUTURE,
    new Date(),
  )

interface MockRepo { findByHash: Mock; revokeAllBySessionId: Mock; save: Mock }

const makeRepo = (token: UserRefreshToken | null = null): MockRepo => ({
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
const makeFactory = (): UserRefreshTokenFactory =>
  ({
    create: vi.fn(() =>
      UserRefreshToken.create({ id: 'new-token', sessionId: 'session-1', hash: 'h:raw', expiresAt: FUTURE }),
    ),
  }) as unknown as UserRefreshTokenFactory

const makeService = (repo: MockRepo = makeRepo()): UserRefreshTokenService =>
  new UserRefreshTokenService(makeUoW(), repo as unknown as UserRefreshTokenRepository, makeFactory(), makeHasher(), makeConfig(), makeKeyGen())

describe('UserRefreshTokenService', () => {
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
      const repo = makeRepo()
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
      const result = makeService().generate()
      expect(result.rawRefreshToken).toBe('raw')
      expect(result.hash).toBe('h:raw')
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('rotate()', () => {
    it('returns a GeneratedRefreshToken with rawRefreshToken and hash', async () => {
      const result = await makeService().rotate(makeToken())
      expect(result.rawRefreshToken).toBe('raw')
      expect(result.hash).toBe('h:raw')
    })
  })
})
