---
title: Phase 3.3.5 — Improve Tests: SchemaBuilderService + Redis Cache
date: 2026-08-15
status: done
priority: medium — no tests on schema logic or Redis wiring
---

# Phase 3.3.5 — Improve Tests

Two areas with zero test coverage added in 3.3.2:

1. `SchemaBuilderService` — logic for building Zod schemas from field definitions
2. `RedisSchemaCache` + `SchemaInvalidationListener` — Redis pub/sub wiring

---

## 3.3.5.1 — SchemaBuilderService unit tests

File: `src/application/services/schema/SchemaBuilderService.test.ts`

No DB, no Redis. Mock `ISchemaCache` with a plain in-memory object.

```ts
const makeCache = (): ISchemaCache => {
  const store = new Map<string, CachedSchema>()
  return {
    get: (id) => store.get(id),
    set: (id, schema) => store.set(id, schema),
    invalidate: vi.fn().mockResolvedValue(undefined),
    evict: (id) => store.delete(id),
  }
}
```

### Cases for `build()`

| case             | fields                                    | expect                            |
| ---------------- | ----------------------------------------- | --------------------------------- |
| required string  | `{ type: 'string', required: true }`      | rejects undefined, accepts string |
| optional string  | `{ type: 'string', required: false }`     | accepts undefined                 |
| number coercion  | `{ type: 'number', required: true }`      | accepts `"42"`, returns `42`      |
| boolean coercion | `{ type: 'boolean', required: true }`     | accepts `"true"`, returns `true`  |
| date coercion    | `{ type: 'date', required: true }`        | accepts ISO string, returns Date  |
| enum             | `{ type: 'enum', enumValues: ['a','b'] }` | accepts `'a'`, rejects `'c'`      |
| string default   | `defaultValue: 'hello'`                   | undefined input → `'hello'`       |
| number default   | `defaultValue: '42'`                      | undefined input → `42`            |

### Cases for `buildForProject()`

- first call builds and caches (cache.set called)
- second call returns cached (cache.get returns hit, build not called again)
- after `invalidate()`, next call rebuilds

### Cases for `invalidate()`

- calls `cache.invalidate(projectId)`
- `cache.invalidate` is awaited (returns Promise)

---

## 3.3.5.2 — RedisSchemaCache unit tests

File: `src/infrastructure/redis/RedisSchemaCache.test.ts`

Mock `RedisProvider` — fake pub client:

```ts
const makePub = () => ({ publish: vi.fn().mockResolvedValue(1) })
const makeRedis = (pub = makePub()) => ({ pub }) as unknown as RedisProvider
```

### Cases

| case                    | action                             | expect                                                   |
| ----------------------- | ---------------------------------- | -------------------------------------------------------- |
| get miss                | `get('x')` before set              | returns `undefined`                                      |
| get hit                 | `set('x', schema)` then `get('x')` | returns schema                                           |
| invalidate clears local | `set` → `invalidate` → `get`       | returns `undefined`                                      |
| invalidate publishes    | `invalidate('proj-1')`             | `pub.publish('schema:invalidate', 'proj-1')` called once |
| evict clears local      | `set` → `evict` → `get`            | returns `undefined`                                      |
| evict does not publish  | `evict('proj-1')`                  | `pub.publish` NOT called                                 |

---

## 3.3.5.3 — SchemaInvalidationListener unit tests

File: `src/infrastructure/redis/SchemaInvalidationListener.test.ts`

Mock `RedisProvider` sub client + mock `ISchemaCache`:

```ts
type MessageHandler = (channel: string, projectId: string) => void

const makeSub = () => {
  let handler: MessageHandler | undefined
  return {
    on: vi.fn((event, h) => {
      if (event === 'message') handler = h
    }),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    emit: (projectId: string) => handler?.('schema:invalidate', projectId),
  }
}
```

### Cases

| case                             | action                      | expect                                        |
| -------------------------------- | --------------------------- | --------------------------------------------- |
| start subscribes                 | `start()`                   | `sub.subscribe('schema:invalidate')` called   |
| message evicts                   | `start()` → emit `'proj-1'` | `cache.evict('proj-1')` called                |
| message on wrong channel ignored | emit different channel      | `cache.evict` NOT called                      |
| stop unsubscribes                | `stop()`                    | `sub.unsubscribe('schema:invalidate')` called |

---

## Priority order

1. `SchemaBuilderService.test.ts` — pure logic, highest value
2. `RedisSchemaCache.test.ts` — verifies pub/sub contract
3. `SchemaInvalidationListener.test.ts` — verifies listener wiring
