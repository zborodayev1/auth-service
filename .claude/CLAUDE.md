# CLAUDE.md — auth-service

Auth service with DDD/CQRS, Express 5, inversify DI, Prisma + PostgreSQL.

## Commands

```bash
pnpm dev          # ts-node + tsconfig-paths hot reload (dotenv/config auto-loaded)
pnpm build        # tsc + tsc-alias → dist/
pnpm start        # node dist/main.js
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint src
pnpm lint:fix     # eslint src --fix
pnpm format       # prettier --write src
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
- `src/application/` — command handlers, app services (no queries yet)
- `src/infrastructure/` — Prisma repos, JWT, bcrypt, UUID, crypto
- `src/application.ts` — Express routes + `requireAuth` middleware
- `src/bootstrap.ts` — inversify Container, wires everything, starts server

**Adding a new command:** create `Command.ts` + `Handler.ts` under `src/application/commands/`, bind handler in `bootstrap.ts`, add route in `application.ts`.

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

`@app/*`, `@domain/*`, `@infra/*`, `@aggregates/*`, `@ports/*` → configured in `tsconfig.json`, resolved at runtime by `tsconfig-paths`, at build time by `tsc-alias`.

## Prisma

Schema: `prisma/schema.prisma`. Generated client: `src/generated/prisma/` (do not edit).
Models: `Client`, `Project`, `ApiKey`, `RefreshToken`.

## TypeScript

Strict mode. `"module": "CommonJS"`, `"target": "ES2020"`. Decorators enabled (`emitDecoratorMetadata`, `experimentalDecorators`).
