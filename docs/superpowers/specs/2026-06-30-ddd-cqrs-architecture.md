---
title: DDD/CQRS Auth Service Architecture
date: 2026-06-30
status: current
---

# Auth Service Architecture

## Stack

- **Runtime:** Node.js, TypeScript (strict, CommonJS via ts-node in dev)
- **Framework:** Express 5
- **DI:** inversify + reflect-metadata
- **DB:** PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Auth:** JWT (jsonwebtoken), bcrypt, UUID, crypto (Node built-in)
- **Package manager:** pnpm

## Folder Structure

```
src/
├── main.ts                        # process error handlers → bootstrap()
├── bootstrap.ts                   # inversify Container wiring, start app
├── application.ts                 # Express app, routes, auth middleware
├── config/
│   └── server.ts                  # ServerConfig (injectable, reads env vars)
│
├── domain/
│   ├── aggregates/
│   │   ├── client/                # Client, Email, Password, ClientName, ClientRepository
│   │   ├── project/               # Project, ProjectName, ApiKey, ApiKeyName, ProjectRepository
│   │   └── refreshToken/          # RefreshToken, RefreshTokenRepository
│   └── ports/                     # Interfaces: AccessTokenService, Hasher, IdGenerator, KeyGenerator, PasswordHasher
│
├── application/
│   ├── commands/
│   │   ├── client/                # RegisterClient, LoginClient, LogoutClient, RefreshAccessToken, ChangeClientEmail, ChangeClientPassword
│   │   └── project/               # CreateProject, CreateNewApiKey
│   └── services/                  # ApiKeyService, RefreshTokenService
│
├── infrastructure/
│   ├── crypto/                    # BcryptPasswordHasher, CryptoHasher, CryptoKeyGenerator
│   ├── identity/                  # UuidIdGenerator
│   ├── jwt/                       # JwtAccessTokenService
│   └── persistence/
│       ├── client/                # PrismaClientRepository, ClientMapper
│       ├── project/               # PrismaProjectRepository, ProjectMapper
│       └── refreshToken/          # PrismaRefreshTokenRepository, RefreshTokenMapper
│
├── libs/
│   └── ddd/                       # AggregateRoot, Identifiable, ValueObject, NameVO
│
└── generated/
    └── prisma/                    # Auto-generated Prisma client (do not edit)
```

## Request Flow

```
HTTP → Express → requireAuth? → CommandHandler.execute() → Repository → Prisma → PostgreSQL
```

`Application` class (`application.ts`) owns all routes and the `requireAuth` middleware. Handlers are injected via inversify.

## API Routes

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | /auth/register | — | RegisterClientHandler |
| POST | /auth/login | — | LoginClientHandler |
| POST | /auth/refresh | — | RefreshAccessTokenHandler |
| POST | /auth/logout | Bearer | LogoutClientHandler |
| PATCH | /clients/me/email | Bearer | ChangeClientEmailHandler |
| PATCH | /clients/me/password | Bearer | ChangeClientPasswordHandler |
| POST | /projects | Bearer | CreateProjectHandler |

## Domain Models

### Client
- `id` (UUID), `name`, `email` (unique), `passwordHash`
- Has many `RefreshToken`, `Project`

### Project
- `id`, `name`, `ownerId` (FK→Client)
- Has one `ApiKey` (optional)
- Unique: `(ownerId, name)`

### ApiKey
- `id`, `name`, `hash` (SHA-256, 64 chars), `revoked`
- Belongs to one `Project` (1:1)

### RefreshToken
- `id`, `clientId` (FK→Client), `hash` (64 chars), `expiresAt`, `revokedAt?`

## Environment Variables

| Var | Default | Notes |
|-----|---------|-------|
| `DATABASE_URL` | — | Required |
| `HTTP_PORT` | `8080` | |
| `JWT_SECRET` | — | Min 32 chars, required |
| `JWT_EXPIRES_IN` | `1h` | |
| `BCRYPT_ROUNDS` | `12` | Must be 10–31 |
| `REFRESH_TOKEN_TTL_MS` | `2592000000` (30d) | |

## Path Aliases (tsconfig-paths)

| Alias | Resolves to |
|-------|-------------|
| `@app/*` | `src/application/*` |
| `@domain/*` | `src/domain/*` |
| `@infra/*` | `src/infrastructure/*` |
| `@aggregates/*` | `src/domain/aggregates/*` |
| `@ports/*` | `src/domain/ports/*` |
