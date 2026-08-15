import { injectable, inject } from 'inversify'
import type { IJob } from '@ports/IJob'
import type { ISchemaCache } from '@ports/ISchemaCache'
import { ISchemaCache as ISchemaCacheToken } from '@ports/ISchemaCache'
import { RedisProvider } from './RedisProvider'
import { SCHEMA_INVALIDATE_CHANNEL } from './RedisSchemaCache'

@injectable()
export class SchemaInvalidationListener implements IJob {
  constructor(
    @inject(RedisProvider) private readonly redis: RedisProvider,
    @inject(ISchemaCacheToken) private readonly cache: ISchemaCache,
  ) {}

  async start(): Promise<void> {
    this.redis.sub.on('message', (channel, projectId) => {
      if (channel === SCHEMA_INVALIDATE_CHANNEL) {
        this.cache.evict(projectId)
      }
    })
    await this.redis.sub.subscribe(SCHEMA_INVALIDATE_CHANNEL)
  }

  async stop(): Promise<void> {
    await this.redis.sub.unsubscribe(SCHEMA_INVALIDATE_CHANNEL)
  }
}
