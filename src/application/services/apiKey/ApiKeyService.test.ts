import { describe, expect, it } from 'vitest'
import { ApiKeyService } from './ApiKeyService'
import type { Hasher } from '@ports/Hasher'
import type { KeyGenerator } from '@ports/KeyGenerator'
import type { IdGenerator } from '@ports/IdGenerator'
import { Name } from '@valueObjects/Name/Name'

const makeHasher = (fn: (s: string) => string = (s) => `hash:${s}`): Hasher => ({ hash: fn })
const makeKeyGen = (key = 'raw-key'): KeyGenerator => ({ generate: (): string => key })
const makeIdGen = (id = 'id-1'): IdGenerator => ({ generate: (): string => id })

const makeService = (): ApiKeyService => new ApiKeyService(makeIdGen(), makeHasher(), makeKeyGen())
const name = (): Name => Name.create('my-api-key-1')

describe('ApiKeyService', () => {
  describe('create()', () => {
    it('returns rawKey from keyGenerator', () => {
      const { rawKey } = makeService().create(name())
      expect(rawKey).toBe('raw-key')
    })

    it('stores hash of rawKey on ApiKey', () => {
      const { apiKey } = makeService().create(name())
      expect(apiKey.hash).toBe('hash:raw-key')
    })

    it('ApiKey is not revoked on creation', () => {
      const { apiKey } = makeService().create(name())
      expect(apiKey.revoked).toBe(false)
    })

    it('ApiKey name matches input', () => {
      const { apiKey } = makeService().create(name())
      expect(apiKey.name).toBe('my-api-key-1')
    })
  })

  describe('verify()', () => {
    it('returns true for correct rawKey', () => {
      expect(makeService().verify('raw-key', 'hash:raw-key')).toBe(true)
    })

    it('returns false for wrong rawKey', () => {
      expect(makeService().verify('bad-key', 'hash:raw-key')).toBe(false)
    })

    it('returns false when hash length differs', () => {
      expect(makeService().verify('x', 'hash:x:extra-padding')).toBe(false)
    })
  })
})
