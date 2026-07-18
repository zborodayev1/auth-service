# CLAUDE.md — auth-service

Auth service with DDD/CQRS, Express 5, inversify DI, Prisma + PostgreSQL.

## Commands

```bash
pnpm dev          # tsup --watch → node dist/main.js (hot reload)
pnpm build        # tsup → dist/
pnpm start        # node dist/main.js
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint src
pnpm lint:fix     # eslint src --fix
pnpm format       # prettier --write src
pnpm format:check # prettier --check src
```

Prisma:
```bash
npx prisma migrate dev --name <name>   # new migration
npx prisma generate                    # regenerate client → src/generated/prisma/
npx prisma studio                      # GUI
npx prisma migrate reset               # reset DB (destructive)
```

## Architecture

See `docs/superpowers/specs/2026-06-30-ddd-cqrs-architecture.md` for full spec.

**Layers:**
- `src/domain/` — aggregates + value objects + repository interfaces (ports)
- `src/application/` — command handlers, app services, factories
- `src/infrastructure/` — Prisma repos, JWT, bcrypt, UUID, crypto, Pino logger
- `src/presentation/` — HTTP layer: controllers, routes, middleware, validators
- `src/contexts/` — inversify context builders (ApplicationContext, InfrastructureContext, ServiceContext)
- `src/libs/` — DDD base classes (AggregateRoot, ValueObject, Identifiable)
- `src/shared/` — error types (AppError, ConflictError, NotFoundError, UnauthorizedError, ValidationError, InternalServerError)
- `src/config/` — server config
- `src/application.ts` — Application class (wraps HttpServerFactory + http.Server)
- `src/bootstrap.ts` — inversify Container, wires everything, starts server

**Aggregates:** `Client`, `Project`, `ApiKey`, `RefreshToken`, `Session`

**Adding a new command:** create `Command.ts` + `Handler.ts` under `src/application/commands/<aggregate>/`, bind in `bootstrap.ts`, add route in `src/presentation/http/routes/`, add handler in controller.

## HTTP API

All client routes under `/client`:

| Method | Path | Auth |
|--------|------|------|
| POST | /client/register | — |
| POST | /client/login | — |
| POST | /client/refresh | — |
| PATCH | /client/email | ✓ |
| PATCH | /client/password | ✓ |
| POST | /client/logout | ✓ |
| POST | /client/logout-all | ✓ |

Refresh token delivered via httpOnly cookie.

## Environment Variables

Copy `.env.example` → `.env`:
```
DATABASE_URL=
HTTP_PORT=8080
JWT_SECRET=          # min 32 chars
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=12
REFRESH_TOKEN_TTL_MS=2592000000
```

## Path Aliases

Configured in `tsconfig.json`, resolved at runtime by `tsconfig-paths`, at build by `tsc-alias`:

| Alias | Points to |
|-------|-----------|
| `@app/*` | `src/application/*` |
| `@factories/*` | `src/application/factories/*` |
| `@services/*` | `src/application/services/*` |
| `@aggregates/*` | `src/domain/aggregates/*` |
| `@valueObjects/*` | `src/domain/valueObjects/*` |
| `@ports/*` | `src/domain/ports/*` |
| `@entities/*` | `src/domain/entities/*` |
| `@infra/*` | `src/infrastructure/*` |
| `@libs/*` | `src/libs/*` |
| `@config/*` | `src/config/*` |
| `@shared/*` | `src/shared/*` |
| `@generated/*` | `src/generated/*` |

## Prisma

Schema: `prisma/schema.prisma`. Generated client: `src/generated/prisma/` (do not edit).
Models: `Client`, `Project`, `ApiKey`, `RefreshToken`, `Session`.

## TypeScript

Native ESM (`"type": "module"`). `"module": "es2022"`, `"moduleResolution": "bundler"`, `"target": "ES2022"`. Strict mode + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Decorators enabled (`emitDecoratorMetadata`, `experimentalDecorators`). Build via **tsup** (esbuild under the hood) — no `tsc-alias` or `tsconfig-paths` needed.
