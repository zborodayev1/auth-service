import { describe, expect, it, vi, type Mock } from 'vitest'
import { SchemaInvalidationListener } from './SchemaInvalidationListener'
import { SCHEMA_INVALIDATE_CHANNEL } from './RedisSchemaCache'
import type { RedisProvider } from './RedisProvider'
import type { ISchemaCache } from '@ports/ISchemaCache'

type MessageHandler = (channel: string, projectId: string) => void

interface SubMock {
  on: Mock
  subscribe: Mock
  unsubscribe: Mock
  emit: (channel: string, projectId: string) => void
}

const makeSub = (): SubMock => {
  let handler: MessageHandler | undefined
  return {
    on: vi.fn((event: string, h: MessageHandler): void => {
      if (event === 'message') handler = h
    }),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    emit: (channel: string, projectId: string): void => handler?.(channel, projectId),
  }
}

const makeCache = (): ISchemaCache => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
  evict: vi.fn(),
})

describe('SchemaInvalidationListener', () => {
  describe('start()', () => {
    it('subscribes to schema invalidation channel', async () => {
      const sub = makeSub()
      const redis = { sub } as unknown as RedisProvider
      const listener = new SchemaInvalidationListener(redis, makeCache())

      await listener.start()

      expect(sub.subscribe).toHaveBeenCalledWith(SCHEMA_INVALIDATE_CHANNEL)
    })

    it('evicts projectId from cache on message', async () => {
      const evictMock = vi.fn()
      const cache: ISchemaCache = { ...makeCache(), evict: evictMock }
      const sub = makeSub()
      const redis = { sub } as unknown as RedisProvider
      const listener = new SchemaInvalidationListener(redis, cache)

      await listener.start()
      sub.emit(SCHEMA_INVALIDATE_CHANNEL, 'proj-1')

      expect(evictMock).toHaveBeenCalledWith('proj-1')
    })

    it('does not evict on message from different channel', async () => {
      const evictMock = vi.fn()
      const cache: ISchemaCache = { ...makeCache(), evict: evictMock }
      const sub = makeSub()
      const redis = { sub } as unknown as RedisProvider
      const listener = new SchemaInvalidationListener(redis, cache)

      await listener.start()
      sub.emit('other:channel', 'proj-1')

      expect(evictMock).not.toHaveBeenCalled()
    })
  })

  describe('stop()', () => {
    it('unsubscribes from schema invalidation channel', async () => {
      const sub = makeSub()
      const redis = { sub } as unknown as RedisProvider
      const listener = new SchemaInvalidationListener(redis, makeCache())

      await listener.stop()

      expect(sub.unsubscribe).toHaveBeenCalledWith(SCHEMA_INVALIDATE_CHANNEL)
    })
  })
})
