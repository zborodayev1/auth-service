import type { ZodObject, ZodType } from 'zod'

export type CachedSchema = ZodObject<Record<string, ZodType>>

export interface ISchemaCache {
  get(projectId: string): CachedSchema | undefined
  set(projectId: string, schema: CachedSchema): void
  invalidate(projectId: string): Promise<void>
  evict(projectId: string): void
}

export const ISchemaCache: unique symbol = Symbol('ISchemaCache')
