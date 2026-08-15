---
title: Phase 0.40 — Redis Integration
date: 2026-08-15
status: planning
priority: high — in-memory rate limiter breaks multi-instance deploys; token revocation currently requires DB lookup on every request
---

# Phase 0.40 — Redis Integration

Three concrete problems Redis solves. Each is independent — can ship in order without waiting for the others.

---

## 0.40.1 — Distributed rate limiting

**Problem:** current `express-rate-limit` stores counters in memory. Two app instances = two independent counters. Rate limit is effectively doubled per user.

**Fix:** replace in-memory store with `rate-limiter-flexible` backed by Redis.

```bash
pnpm add ioredis rate-limiter-flexible
```

```ts
// src/infrastructure/redis/RedisClient.ts
import Redis from 'ioredis'

@injectable()
export class RedisClient {
  readonly client: Redis

  constructor(@inject(TOKENS.RedisUrl) url: string) {
    this.client = new Redis(url, {
      enableOfflineQueue: false,
      lazyConnect: true,
    })
  }
}
```

```ts
// src/presentation/http/middleware/rateLimiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'

const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:auth',
  points: 10,
  duration: 60,
})
```

**Port:**
```ts
// src/domain/ports/cache/IRedisClient.ts
export interface IRedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}
```

---

## 0.40.2 — Token revocation cache

**Problem:** on every authenticated request, middleware queries DB to check if refresh token is revoked. At scale this is a DB hit per request.

**Fix:** cache revoked token hashes in Redis with TTL = token's remaining lifetime.

```ts
// On revoke (logout, password change, session revoke):
await redis.set(`revoked:${tokenHash}`, '1', remainingTtlSeconds)

// On authenticate:
const isRevoked = await redis.exists(`revoked:${tokenHash}`)
if (isRevoked) throw new UnauthorizedError('Token revoked')
```

On cache miss: fall through to DB (cold start, Redis restart). Cache is a performance layer, not the source of truth.

---

## 0.40.3 — Pub/Sub foundation for webhooks

**Problem:** webhook delivery (Phase 0.44) must not block the HTTP response. Needs async processing.

**Fix:** Redis Pub/Sub or Redis Streams as the message channel between event publishers and webhook delivery workers.

```ts
// src/infrastructure/events/RedisEventBus.ts
@injectable()
export class RedisEventBus implements IEventBus {
  constructor(
    @inject(TOKENS.RedisClient) private readonly pub: Redis,
    @inject(TOKENS.RedisClient) private readonly sub: Redis,
  ) {}

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.pub.publish('domain-events', JSON.stringify(event))
    }
  }
}
```

Use Redis Streams (`XADD`/`XREADGROUP`) over Pub/Sub for webhook delivery — Streams support consumer groups and at-least-once delivery. Pub/Sub is fire-and-forget.

---

## 0.40.4 — Environment + DI wiring

New env var: `REDIS_URL=redis://localhost:6379`

Add to `.env.example`. Add `REDIS_URL` to `src/config/`.

Bind `IRedisClient` in `InfrastructureContext`. Add Redis service to `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

---

## Priority Order

1. `IRedisClient` port + `ioredis` adapter + DI binding + docker-compose
2. Distributed rate limiting (replaces in-memory)
3. Token revocation cache
4. Pub/Sub / Streams foundation (unblocks Phase 0.44)
