import { describe, expect, it, vi } from 'vitest'
import { SchemaBuilderService } from './SchemaBuilderService'
import type { ISchemaCache, CachedSchema } from '@ports/ISchemaCache'
import type { ProjectFieldDefinition } from './SchemaBuilderService'

const makeCache = (): ISchemaCache => {
  const store = new Map<string, CachedSchema>()
  return {
    get: (id) => store.get(id),
    set: (id, schema) => store.set(id, schema),
    invalidate: vi.fn().mockResolvedValue(undefined),
    evict: (id) => store.delete(id),
  }
}

const field = (overrides: Partial<ProjectFieldDefinition> = {}): ProjectFieldDefinition => ({
  id: 'field-1',
  name: 'Field',
  type: 'string',
  required: true,
  ...overrides,
})

const makeService = (cache = makeCache()): SchemaBuilderService =>
  new SchemaBuilderService(cache)

describe('SchemaBuilderService', () => {
  describe('build()', () => {
    it('required string rejects undefined', () => {
      const schema = makeService().build([field({ type: 'string', required: true })])
      expect(() => schema.parse({})).toThrow()
    })

    it('optional string accepts undefined', () => {
      const schema = makeService().build([field({ type: 'string', required: false })])
      expect(() => schema.parse({})).not.toThrow()
    })

    it('number coerces string input', () => {
      const schema = makeService().build([field({ type: 'number', required: true })])
      const result = schema.parse({ 'field-1': '42' })
      expect(result['field-1']).toBe(42)
    })

    it('boolean coerces string input', () => {
      const schema = makeService().build([field({ type: 'boolean', required: true })])
      const result = schema.parse({ 'field-1': 'true' })
      expect(result['field-1']).toBe(true)
    })

    it('date coerces ISO string input', () => {
      const schema = makeService().build([field({ type: 'date', required: true })])
      const result = schema.parse({ 'field-1': '2024-01-01T00:00:00.000Z' })
      expect(result['field-1']).toBeInstanceOf(Date)
    })

    it('enum accepts valid value', () => {
      const schema = makeService().build([
        field({ type: 'enum', required: true, enumValues: ['a', 'b'] }),
      ])
      expect(() => schema.parse({ 'field-1': 'a' })).not.toThrow()
    })

    it('enum rejects invalid value', () => {
      const schema = makeService().build([
        field({ type: 'enum', required: true, enumValues: ['a', 'b'] }),
      ])
      expect(() => schema.parse({ 'field-1': 'c' })).toThrow()
    })

    it('string default applied on undefined input', () => {
      const schema = makeService().build([
        field({ type: 'string', required: false, defaultValue: 'hello' }),
      ])
      const result = schema.parse({})
      expect(result['field-1']).toBe('hello')
    })

    it('number default parsed from string', () => {
      const schema = makeService().build([
        field({ type: 'number', required: false, defaultValue: '42' }),
      ])
      const result = schema.parse({})
      expect(result['field-1']).toBe(42)
    })
  })

  describe('buildForProject()', () => {
    it('first call builds and caches', () => {
      const cache = makeCache()
      const setCacheSpy = vi.spyOn(cache, 'set')
      const service = makeService(cache)

      service.buildForProject('proj-1', [field()])

      expect(setCacheSpy).toHaveBeenCalledOnce()
    })

    it('second call returns cached schema without rebuilding', () => {
      const cache = makeCache()
      const buildSpy = vi.spyOn(SchemaBuilderService.prototype as never, 'build' as never)
      const service = makeService(cache)

      service.buildForProject('proj-1', [field()])
      service.buildForProject('proj-1', [field()])

      expect(buildSpy).toHaveBeenCalledOnce()
    })

    it('after invalidate next call rebuilds', async () => {
      const cache = makeCache()
      const service = makeService(cache)

      service.buildForProject('proj-1', [field()])
      await service.invalidate('proj-1')
      cache.evict('proj-1')

      const setCacheSpy = vi.spyOn(cache, 'set')
      service.buildForProject('proj-1', [field()])

      expect(setCacheSpy).toHaveBeenCalledOnce()
    })
  })

  describe('invalidate()', () => {
    it('calls cache.invalidate with projectId', async () => {
      const invalidateMock = vi.fn().mockResolvedValue(undefined)
      const store = new Map<string, CachedSchema>()
      const cache: ISchemaCache = {
        get: (id) => store.get(id),
        set: (id, schema) => store.set(id, schema),
        invalidate: invalidateMock,
        evict: (id) => store.delete(id),
      }
      const service = makeService(cache)

      await service.invalidate('proj-1')

      expect(invalidateMock).toHaveBeenCalledWith('proj-1')
    })
  })
})
