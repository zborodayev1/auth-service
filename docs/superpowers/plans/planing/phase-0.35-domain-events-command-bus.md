---
title: Phase 0.35 — Domain Events & Command/Query Bus
date: 2026-08-15
status: planning
priority: medium — architectural, best done while codebase is still small; deferred cost grows linearly with handler count
---

# Phase 0.35 — Domain Events & Command/Query Bus

Two independent architectural improvements. Domain events enable decoupled side-effects (send email after registration, invalidate cache after field change). Command/query bus gives a single dispatch point for cross-cutting concerns. Both are optional now but become painful to retrofit at 50+ handlers.

---

## 0.35.1 — Domain Events (complete or remove)

**Problem:** `AggregateRoot.ts` references `DomainEvent` but there is no `IEventBus`, no event publisher, and no subscribers. Events are collected by aggregates but never dispatched. A half-implemented feature is worse than no feature: it creates false confidence and dead code.

**Decision point — choose one:**

### Option A — Remove (simplest)

Strip `domainEvents` from `AggregateRoot`. Remove all `addDomainEvent()` calls from aggregates. No event bus, no subscribers. Side-effects stay inline in handlers (call email service directly after saving).

**When this is right:** side-effects are few and predictable. Current handlers only need email (password reset) and cache invalidation — both already wired inline. Premature event bus adds abstraction for two use cases.

### Option B — Implement synchronous in-process event bus

```ts
// src/libs/events/IEventBus.ts
export interface DomainEvent {
  readonly occurredAt: Date
}

export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>
}

export interface IEventBus {
  publish(events: DomainEvent[]): Promise<void>
  subscribe<T extends DomainEvent>(
    eventClass: new (...args: any[]) => T,
    handler: IEventHandler<T>,
  ): void
}
```

```ts
// src/infrastructure/events/InMemoryEventBus.ts
@injectable()
export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, IEventHandler<any>[]>()

  subscribe<T extends DomainEvent>(eventClass: new (...args: any[]) => T, handler: IEventHandler<T>): void {
    const key = eventClass.name
    const existing = this.handlers.get(key) ?? []
    this.handlers.set(key, [...existing, handler])
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.constructor.name) ?? []
      await Promise.all(handlers.map(h => h.handle(event)))
    }
  }
}
```

**Dispatch from handlers:** after `unitOfWork.commit()`, pull events from the aggregate and publish:
```ts
const client = await this.clients.findById(id)
const updatedClient = client.changeEmail(newEmail)
await this.unitOfWork.commit(async (tx) => {
  await tx.clients.save(updatedClient)
})
await this.eventBus.publish(updatedClient.pullDomainEvents())
```

**When this is right:** multiple side-effects per command, or side-effects that will grow (audit log, notifications, webhook delivery). Adds ~100 lines of infrastructure, eliminates handler bloat.

### Recommendation

**Ship Option A now.** Implement Option B when a second subscriber for the same event appears (that's the signal you actually need a bus). One subscriber → inline is cleaner. Two subscribers → extract the bus.

---

## 0.35.2 — ICommandBus / IQueryBus

**Problem:** Controllers directly instantiate and call handlers:
```ts
// ClientController.ts
const result = await this.registerHandler.execute(command)
```

Each new cross-cutting concern (logging per-command, tracing, validation timing) requires editing every handler call site in every controller.

### Design

```ts
// src/libs/cqrs/ICommandBus.ts
export interface ICommandBus {
  execute<TResult>(command: object): Promise<TResult>
}

// src/libs/cqrs/IQueryBus.ts
export interface IQueryBus {
  execute<TResult>(query: object): Promise<TResult>
}
```

```ts
// src/infrastructure/cqrs/InversifyCommandBus.ts
@injectable()
export class InversifyCommandBus implements ICommandBus {
  constructor(@inject(Container) private readonly container: Container) {}

  async execute<TResult>(command: object): Promise<TResult> {
    const handlerToken = `${command.constructor.name}Handler`
    const handler = this.container.get<ICommandHandler<typeof command, TResult>>(handlerToken)
    return handler.execute(command)
  }
}
```

Controllers become:
```ts
// Before
await this.registerHandler.execute(command)

// After
await this.commandBus.execute(command)
```

**Cross-cutting hook point:**
```ts
async execute<TResult>(command: object): Promise<TResult> {
  const name = command.constructor.name
  this.logger.debug({ command: name }, 'dispatching command')
  const start = Date.now()
  try {
    const result = await handler.execute(command)
    this.logger.debug({ command: name, ms: Date.now() - start }, 'command ok')
    return result
  } catch (err) {
    this.logger.error({ command: name, err }, 'command failed')
    throw err
  }
}
```

### Trade-offs

| | Direct handler injection | Command bus |
|---|---|---|
| Type safety | Full — TS infers return type | Partial — `execute<T>` requires cast |
| Discoverability | Explicit in constructor | Implicit — handler resolved at runtime |
| Cross-cutting | Every controller, manually | Single place |
| DI tokens | N handlers per controller | 1 bus per controller |

**Recommendation:** introduce the bus after HTTP tests exist (Phase 0.32). Refactoring 3 controllers is cheap; doing it without tests is risky. The bus is worth it once correlation IDs need to appear in per-command log lines — that's when the single dispatch point pays for itself.

---

## Priority Order

1. `AggregateRoot` domain events — decide Option A or B and ship it; remove dead code if Option A
2. `ICommandBus` — after HTTP tests land, one refactor pass across all controllers
3. `IQueryBus` — same timing as command bus, lower value per refactor
