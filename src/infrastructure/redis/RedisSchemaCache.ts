import { injectable, inject } from 'inversify'
import type { ISchemaCache, CachedSchema } from '@ports/ISchemaCache'
import { RedisProvider } from './RedisProvider'

export const SCHEMA_INVALIDATE_CHANNEL = 'schema:invalidate'

@injectable()
export class RedisSchemaCache implements ISchemaCache {
  private readonly local = new Map<string, CachedSchema>()

  constructor(@inject(RedisProvider) private readonly redis: RedisProvider) {}

  get(projectId: string): CachedSchema | undefined {
    return this.local.get(projectId)
  }

  set(projectId: string, schema: CachedSchema): void {
    this.local.set(projectId, schema)
  }

  async invalidate(projectId: string): Promise<void> {
    this.local.delete(projectId)
    await this.redis.pub.publish(SCHEMA_INVALIDATE_CHANNEL, projectId)
  }

  evict(projectId: string): void {
    this.local.delete(projectId)
  }
}
