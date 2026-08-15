import { injectable, inject } from 'inversify'
import Redis from 'ioredis'
import { ServerConfig } from '@config/server/server'

@injectable()
export class RedisProvider {
  readonly pub: Redis
  readonly sub: Redis

  constructor(@inject(ServerConfig) config: ServerConfig) {
    this.pub = new Redis(config.redisUrl)
    this.sub = new Redis(config.redisUrl)
  }

  async disconnect(): Promise<void> {
    await Promise.all([this.pub.quit(), this.sub.quit()])
  }
}
