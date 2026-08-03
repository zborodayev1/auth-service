---
title: Phase 1.4 — RegisterClientHandler Missing UnitOfWork Wrap
date: 2026-08-03
status: backlog
priority: medium — correctness bug, leaves orphaned client records on partial failure
---

# Phase 2.16 — `RegisterClientHandler` Missing `UnitOfWork` Wrap

`RegisterClientHandler` saves the client record outside a transaction, then calls `authService.login` (which runs in its own internal transaction). If the second step fails, the client row exists in the database but the registration response was an error — the user thinks registration failed, but the account is already created.

---

## The problem

```ts
// RegisterClientHandler.execute — current
await this.clients.save(client)           // step 1: outside any transaction

const tokens = await this.authService.login({  // step 2: internal UoW transaction
  clientId: client.id,
  ...
})

return { clientId: client.id, ...tokens }
```

If `authService.login` throws (e.g., DB error during session/refresh token insert), the client row from step 1 is committed. The caller receives an error response. They retry registration → `ConflictError('EMAIL_TAKEN')`. They cannot register again. They also cannot login because they don't know the registration "succeeded". The account is effectively locked.

---

## Comparison with `RegisterUserHandler`

`RegisterUserHandler` wraps everything atomically:

```ts
const tokens = await this.unitOfWork.execute(async () => {
  await this.users.save(user)              // inside transaction
  await this.fieldValues.saveMany(values)  // inside transaction
  return this.authService.login({ ... })   // nested UoW reuses outer transaction
})
```

`PrismaUnitOfWork.execute` detects `isInTransaction()` and reuses the outer transaction for the nested `authService.login` call — no double-wrapping. The pattern is safe.

`RegisterClientHandler` doesn't have a `UnitOfWork` inject and uses no transaction boundary.

---

## Fix

Inject `UnitOfWork` and wrap both steps:

```ts
@injectable()
export class RegisterClientHandler {
  constructor(
    @inject(UnitOfWork) private readonly unitOfWork: UnitOfWork,   // ← add
    @inject(ClientRepository) private readonly clients: ClientRepository,
    @inject(PasswordHasher) private readonly passwordHasher: PasswordHasher,
    @inject(IdGenerator) private readonly idGenerator: IdGenerator,
    @inject(ClientAuthService) private readonly authService: ClientAuthService,
  ) {}

  async execute(command: RegisterClientCommand): Promise<RegisterClientResult> {
    const email = Email.create(command.email)

    const exists = await this.clients.findByEmail(email)
    if (exists) throw new ConflictError(...)

    Password.validateRaw(command.password)
    const hash = await this.passwordHasher.hash(command.password)
    const password = Password.fromHash(hash)
    const id = this.idGenerator.generate()
    const client = Client.create(id, Name.create(command.name), email, password)

    const tokens = await this.unitOfWork.execute(async () => {   // ← wrap
      await this.clients.save(client)
      return this.authService.login({
        clientId: client.id,
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
        deviceName: command.deviceName,
      })
    })

    return { clientId: client.id, ...tokens }
  }
}
```

Note: `passwordHasher.hash` (bcrypt) is intentionally kept outside the transaction — bcrypt is CPU-bound and slow, holding a DB transaction open during it blocks connection pool slots. Hash first, then open transaction.

---

## Checklist

- [ ] `RegisterClientHandler` — add `@inject(UnitOfWork)` constructor param
- [ ] Wrap `clients.save(client)` + `authService.login(...)` in `this.unitOfWork.execute(...)`
- [ ] Keep `Email.create`, `clients.findByEmail`, `Password.validateRaw`, `passwordHasher.hash` outside the `unitOfWork.execute` block
- [ ] Bind `UnitOfWork` check: confirm `UnitOfWork` is already bound in DI context (it is — used by other handlers in `ClientContext`)
- [ ] Verify `RegisterUserHandler` uses the same pattern as a reference
