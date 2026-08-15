import { describe, expect, it, vi } from 'vitest'
import { RedisSchemaCache, SCHEMA_INVALIDATE_CHANNEL } from './RedisSchemaCache'
import type { RedisProvider } from './RedisProvider'
import type { CachedSchema } from '@ports/ISchemaCache'
import z from 'zod'

const makePub = (): { publish: typeof vi.fn } => ({ publish: vi.fn().mockResolvedValue(1) })

const makeRedis = (pub = makePub()): RedisProvider => ({ pub }) as unknown as RedisProvider

const dummySchema = z.object({ name: z.string() }) as unknown as CachedSchema

describe('RedisSchemaCache', () => {
  describe('get()', () => {
    it('returns undefined for unknown projectId', () => {
      const cache = new RedisSchemaCache(makeRedis())
      expect(cache.get('proj-1')).toBeUndefined()
    })

    it('returns schema after set', () => {
      const cache = new RedisSchemaCache(makeRedis())
      cache.set('proj-1', dummySchema)
      expect(cache.get('proj-1')).toBe(dummySchema)
    })
  })

  describe('invalidate()', () => {
    it('clears local cache', async () => {
      const cache = new RedisSchemaCache(makeRedis())
      cache.set('proj-1', dummySchema)

      await cache.invalidate('proj-1')

      expect(cache.get('proj-1')).toBeUndefined()
    })

    it('publishes to Redis channel', async () => {
      const pub = makePub()
      const cache = new RedisSchemaCache(makeRedis(pub))

      await cache.invalidate('proj-1')

      expect(pub.publish).toHaveBeenCalledWith(SCHEMA_INVALIDATE_CHANNEL, 'proj-1')
    })

    it('publishes exactly once', async () => {
      const pub = makePub()
      const cache = new RedisSchemaCache(makeRedis(pub))

      await cache.invalidate('proj-1')

      expect(pub.publish).toHaveBeenCalledOnce()
    })
  })

  describe('evict()', () => {
    it('clears local cache', () => {
      const cache = new RedisSchemaCache(makeRedis())
      cache.set('proj-1', dummySchema)

      cache.evict('proj-1')

      expect(cache.get('proj-1')).toBeUndefined()
    })

    it('does not publish to Redis', () => {
      const pub = makePub()
      const cache = new RedisSchemaCache(makeRedis(pub))
      cache.set('proj-1', dummySchema)

      cache.evict('proj-1')

      expect(pub.publish).not.toHaveBeenCalled()
    })
  })
})
