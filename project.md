# File: .claude/CLAUDE.md

```markdown
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

```

# File: .env

```bash
HTTP_PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/app"
BCRYPT_ROUNDS=12
JWT_SECRET=7b4d9e1f2a8c6d3b5f9174e0c2ab8d4f1e6c937a5b20d8f4c19e7a3d6f8b2c51
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_TTL_MS=2592000000

```

# File: .env.example

```bash
HTTP_PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/app"
BCRYPT_ROUNDS=12
JWT_SECRET=YOU_SECRET_KEY
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_TTL_MS=2002000000

```

# File: .gitignore

```
.directory
node_modules
dist
.env
environment.ts
generated
projectUtils
```

# File: .prettierignore

```
dist/
node_modules/
package-lock.json
```

# File: .prettierrc

```
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all",
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}

```

# File: docker-compose.yml

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:17
    container_name: postgres-db
    restart: unless-stopped

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: app

    ports:
      - '5432:5432'

    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

```

# File: docs/superpowers/specs/2026-06-30-ddd-cqrs-architecture.md

```markdown
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

```

# File: eslint.config.js

```javascript
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs['strict-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,

      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Enforce explicit return types on functions
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // No floating promises — must handle async results
      '@typescript-eslint/no-floating-promises': 'error',

      // No any
      '@typescript-eslint/no-explicit-any': 'error',

      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // No non-null assertions
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  prettierConfig,
]

```

# File: package.json

```json
{
  "name": "borodayev-auth-systems",
  "version": "1.0.0",
  "description": "Open source auth service",
  "main": "dist/main.js",
  "type": "module",
  "scripts": {
    "dev": "tsup --watch --onSuccess 'node dist/main.js'",
    "build": "tsup",
    "start": "node dist/main.js",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write src",
    "format:check": "prettier --check src",
    "typecheck": "tsc --noEmit"
  },
  "repository": {
    "type": "git",
    "url": "git@github-personal:zborodayev1/borodayev-auth-systems"
  },
  "author": "zborodayev1",
  "keywords": [
    "auth",
    "jwt",
    "nodejs"
  ],
  "license": "MIT",
  "dependencies": {
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.4.1",
    "express": "^5.2.1",
    "helmet": "^8.2.0",
    "http": "0.0.1-security",
    "inversify": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.22.0",
    "prisma": "^7.8.0",
    "reflect-metadata": "^0.2.2",
    "uuid": "^14.0.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@swc/core": "^1.15.43",
    "@types/bcrypt": "^6.0.0",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^25.5.0",
    "@types/pg": "^8.20.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "prettier": "^3.0.0",
    "tsup": "^8.5.1",
    "tsx": "^4.23.1",
    "typescript": "^6.0.2"
  }
}

```

# File: prisma/migrations/20260628092028_init/migration.sql

```sql
-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hash" CHAR(64) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "projectId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_projectId_key" ON "ApiKey"("projectId");

-- CreateIndex
CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

```

# File: prisma/migrations/20260628123715_project_owner_name_unique/migration.sql

```sql
/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,name]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Project_ownerId_name_key" ON "Project"("ownerId", "name");

```

# File: prisma/migrations/20260628124323_limit_string_lengths/migration.sql

```sql
/*
  Warnings:

  - You are about to alter the column `name` on the `ApiKey` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `name` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `name` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.

*/
-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE VARCHAR(64);

```

# File: prisma/migrations/20260628132946_fix_varchar_lengths/migration.sql

```sql
/*
  Warnings:

  - You are about to alter the column `email` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(254)`.
  - You are about to alter the column `passwordHash` on the `Client` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(60)`.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "email" SET DATA TYPE VARCHAR(254),
ALTER COLUMN "passwordHash" SET DATA TYPE CHAR(60);

```

# File: prisma/migrations/20260629112649_add_refresh_token_model/migration.sql

```sql
-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "hash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_clientId_key" ON "RefreshToken"("clientId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

```

# File: prisma/migrations/20260629133650_refresh_token_hash_unique/migration.sql

```sql
/*
  Warnings:

  - A unique constraint covering the columns `[hash]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_hash_key" ON "RefreshToken"("hash");

```

# File: prisma/migrations/20260629151117_multi_session_refresh_tokens/migration.sql

```sql
-- DropIndex
DROP INDEX "RefreshToken_clientId_key";

-- CreateIndex
CREATE INDEX "RefreshToken_clientId_idx" ON "RefreshToken"("clientId");

```

# File: prisma/migrations/20260713101719_add_session_model/migration.sql

```sql
-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "refreshTokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceName" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

```

# File: prisma/migrations/20260713101810_session_add_index_on_client_id/migration.sql

```sql
-- CreateIndex
CREATE INDEX "Session_clientId_idx" ON "Session"("clientId");

```

# File: prisma/migrations/20260714171744_refresh_token_rotation/migration.sql

```sql
/*
  Warnings:

  - You are about to drop the column `clientId` on the `RefreshToken` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenHash` on the `Session` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_clientId_fkey";

-- DropIndex
DROP INDEX "RefreshToken_clientId_idx";

-- DropIndex
DROP INDEX "Session_refreshTokenHash_key";

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "clientId",
ADD COLUMN     "sessionId" UUID NOT NULL,
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "refreshTokenHash";

-- CreateIndex
CREATE INDEX "RefreshToken_sessionId_idx" ON "RefreshToken"("sessionId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE UNIQUE INDEX refresh_token_one_active
ON "RefreshToken" ("sessionId")
WHERE "usedAt" IS NULL;
```

# File: prisma/migrations/migration_lock.toml

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"

```

# File: prisma/schema.prisma

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Get a free hosted Postgres database in seconds: `npx create-db`
// npx prisma migrate dev --name init
// npx prisma generate
// npx prisma studio
// npx prisma migrate reset

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"

}

model Project {
  id        String @id @default(uuid()) @db.Uuid
  name      String @db.VarChar(64)

  ownerId   String @db.Uuid
  owner   Client @relation(fields: [ownerId], references: [id])

  apiKey ApiKey?

  createdAt DateTime @default(now())
  @@unique([ownerId, name])
}

model ApiKey {
  id        String  @id @default(uuid()) @db.Uuid
  name      String  @db.VarChar(64)
  hash      String  @db.Char(64)
  revoked Boolean @default(false)

  projectId String @unique @db.Uuid
  project   Project @relation(fields: [projectId], references: [id])

  createdAt DateTime @default(now())

  @@index([projectId])
}

model Client {
  id    String @id @default(uuid()) @db.Uuid
  name  String @db.VarChar(64)
  email String @unique @db.VarChar(254)
  passwordHash  String @db.Char(60)

  sessions Session[]
  projects      Project[]

  createdAt DateTime @default(now())
}

model RefreshToken {
    id String @id @default(uuid()) @db.Uuid

    sessionId String @db.Uuid
    session Session @relation(fields:[sessionId], references:[id])

    hash String @unique @db.Char(64)

    usedAt DateTime?

    revokedAt DateTime?

    expiresAt DateTime

    createdAt DateTime @default(now())

    @@index([sessionId])
}

model Session {
    id                String   @id @default(uuid()) @db.Uuid

    clientId          String   @db.Uuid
    client            Client   @relation(fields: [clientId], references: [id])

    refreshTokens RefreshToken[]

    expiresAt         DateTime
    revokedAt         DateTime?

    createdAt         DateTime @default(now())
    lastUsedAt        DateTime @default(now())

    userAgent         String?
    ipAddress         String?
    deviceName        String?

    @@index([clientId])
}
```

# File: prisma.config.ts

```typescript
// This file was generated by Prisma, and assumes you have installed the following:
// npm install --save-dev prisma dotenv
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})

```

# File: README.md

```markdown
# auth-systems

Open source authentication service built with Node.js and TypeScript. Free forever — for startups, side projects, and anyone who needs a solid auth foundation without reinventing the wheel.

> Pet project by [zborodayev1](https://github.com/zborodayev1) — built for job applications and real-world use.

---

## Features

- JWT-based authentication (access tokens)
- Password hashing with bcrypt
- Clean domain-driven structure (context / service / repository / router)
- TypeScript strict mode
- Express 5

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript 6 |
| Framework | Express 5 |
| Auth | JSON Web Token |
| Hashing | bcrypt |
| Config | dotenv |

---

## Project Structure

```
src/
├── config/          # App configuration (env, constants)
├── context/
│   └── auth/
│       ├── controllers/   # Request handlers
│       ├── services/      # Business logic
│       ├── repositories/  # Data access
│       ├── routers/       # Route definitions
│       └── index.ts       # Auth context entry
├── share/           # Shared types, interfaces, middleware
├── utils/           # Utility helpers
└── server.ts        # Entry point
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/zborodayev1/borodayev-auth-systems.git
cd borodayev-auth-systems
npm install
```

### Environment

Create a `.env` file in the root:

```env
PORT=3000
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
```

### Run

```bash
# Development (watch mode)
npm run start:dev

# Build
npm run build

# Production
npm start
```

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

```

# File: src/@types/express.d.ts

```typescript
import type { AccessTokenPayload } from '@ports/AccessTokenService'

declare global {
  namespace Express {
    interface Request {
      auth: AccessTokenPayload
    }
  }
}

export {}

```

# File: src/application/commands/client/ChangeClientEmail/ChangeClientEmailCommand.ts

```typescript
export class ChangeClientEmailCommand {
  constructor(
    public readonly clientId: string,
    public readonly newEmail: string,
    public readonly password: string,
  ) {}
}

```

# File: src/application/commands/client/ChangeClientEmail/ChangeClientEmailHandler.ts

```typescript
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { inject, injectable } from 'inversify'
import { ChangeClientEmailCommand } from './ChangeClientEmailCommand'
import { Email } from '@aggregates/client/Email'
import { PasswordHasher } from '@ports/PasswordHasher'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

interface ChangeClientEmailResult {
  message: string
}

@injectable()
export class ChangeClientEmailHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: ChangeClientEmailCommand): Promise<ChangeClientEmailResult> {
    const client = await this.clients.findById(command.clientId)
    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', {
        clientId: command.clientId,
      })
    }

    const isPasswordValid = await this.passwordHasher.verify(
      command.password,
      client.password.getHash(),
    )
    if (!isPasswordValid)
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        clientId: command.clientId,
      })

    const newEmail = Email.create(command.newEmail)

    const exists = await this.clients.findByEmail(newEmail)

    if (exists) {
      throw new ConflictError('Email already taken', 'EMAIL_TAKEN', {
        email: newEmail.toString(),
        clientId: command.clientId,
      })
    }

    const updated = client.changeEmail(newEmail)
    await this.clients.save(updated)

    return { message: 'Email changed successfully' }
  }
}

```

# File: src/application/commands/client/ChangeClientPassword/ChangeClientPasswordCommand.ts

```typescript
export class ChangeClientPasswordCommand {
  constructor(
    public readonly clientId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}

```

# File: src/application/commands/client/ChangeClientPassword/ChangeClientPasswordHandler.ts

```typescript
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable, inject } from 'inversify'
import { ChangeClientPasswordCommand } from './ChangeClientPasswordCommand'
import { Password } from '@aggregates/client/Password'
import { PasswordHasher } from '@ports/PasswordHasher'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'

interface ChangeClientPasswordResult {
  message: string
}

@injectable()
export class ChangeClientPasswordHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: ChangeClientPasswordCommand): Promise<ChangeClientPasswordResult> {
    Password.validateRaw(command.newPassword)

    if (command.currentPassword === command.newPassword) {
      throw new ConflictError('New password must differ from current', 'PASSWORD_NOT_DIFFERENT', {
        clientId: command.clientId,
      })
    }

    const client = await this.clients.findById(command.clientId)
    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND', {
        clientId: command.clientId,
      })
    }

    const isCurrentPasswordValid = await this.passwordHasher.verify(
      command.currentPassword,
      client.password.getHash(),
    )

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect', 'INVALID_PASSWORD', {
        clientId: command.clientId,
      })
    }

    const hash = await this.passwordHasher.hash(command.newPassword)
    const newPassword = Password.fromHash(hash)
    const updated = client.changePassword(newPassword)

    await this.clients.save(updated)
    await this.sessions.revokeAllByClientId(command.clientId)

    return {
      message: 'Password changed successfully',
    }
  }
}

```

# File: src/application/commands/client/LoginClient/LoginClientCommand.ts

```typescript
export class LoginClientCommand {
  constructor(
    public readonly password: string,
    public readonly email: string,

    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {}
}

```

# File: src/application/commands/client/LoginClient/LoginClientHandler.ts

```typescript
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { Email } from '@aggregates/client/Email'
import { PasswordHasher } from '@ports/PasswordHasher'
import { inject, injectable } from 'inversify'
import { LoginClientCommand } from './LoginClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { AuthService } from '@services/auth/AuthService'

interface LoginClientResult {
  clientId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class LoginClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async execute(command: LoginClientCommand): Promise<LoginClientResult> {
    const email = Email.create(command.email)

    const client = await this.clients.findByEmail(email)
    if (!client) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const valid = await this.passwordHasher.verify(command.password, client.password.getHash())
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const tokens = await this.authService.login({
      clientId: client.id,
      deviceName: command.deviceName,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    })

    return {
      clientId: client.id,
      ...tokens,
    }
  }
}

```

# File: src/application/commands/client/LogoutAllSessions/LogoutAllSessionsCommand.ts

```typescript
export class LogoutAllSessionsCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
  ) {}
}

```

# File: src/application/commands/client/LogoutAllSessions/LogoutAllSessionsHandler.ts

```typescript
import { inject, injectable } from 'inversify'
import { LogoutAllSessionsCommand } from './LogoutAllSessionsCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'

interface LogoutAllSessionsResult {
  message: string
}

@injectable()
export class LogoutAllSessionsHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: LogoutAllSessionsCommand): Promise<LogoutAllSessionsResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    await this.sessions.revokeAllByClientId(session.clientId)

    return { message: 'All sessions revoked successfully' }
  }
}

```

# File: src/application/commands/client/LogoutCurrentSession/LogoutCurrentSessionCommand.ts

```typescript
export class LogoutCurrentSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly clientId: string,
  ) {}
}

```

# File: src/application/commands/client/LogoutCurrentSession/LogoutCurrentSessionHandler.ts

```typescript
import { inject, injectable } from 'inversify'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { LogoutCurrentSessionCommand } from './LogoutCurrentSessionCommand'

interface LogoutCurrentSessionResult {
  message: string
}

@injectable()
export class LogoutCurrentSessionHandler {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async execute(command: LogoutCurrentSessionCommand): Promise<LogoutCurrentSessionResult> {
    const session = await this.sessions.findById(command.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Invalid or expired session')
    }

    await this.sessions.save(session.revoke())

    return { message: 'Session revoked successfully' }
  }
}

```

# File: src/application/commands/client/RefreshAccessToken/RefreshAccessTokenCommand.ts

```typescript
export class RefreshAccessTokenCommand {
  constructor(public readonly rawToken: string) {}
}

```

# File: src/application/commands/client/RefreshAccessToken/RefreshAccessTokenHandler.ts

```typescript
import { inject, injectable } from 'inversify'
import type { RefreshAccessTokenCommand } from './RefreshAccessTokenCommand'
import { AuthService } from '@services/auth/AuthService'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

@injectable()
export class RefreshAccessTokenHandler {
  constructor(
    @inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async execute(command: RefreshAccessTokenCommand): Promise<TokenPair> {
    return await this.authService.refresh(command.rawToken)
  }
}

```

# File: src/application/commands/client/RegisterClient/RegisterClientCommand.ts

```typescript
export class RegisterClientCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,

    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {}
}

```

# File: src/application/commands/client/RegisterClient/RegisterClientHandler.ts

```typescript
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { injectable, inject } from 'inversify'
import { RegisterClientCommand } from './RegisterClientCommand'
import { Email } from '@aggregates/client/Email'
import { Password } from '@aggregates/client/Password'
import { Client } from '@aggregates/client/Client'
import { PasswordHasher } from '@ports/PasswordHasher'
import { IdGenerator } from '@ports/IdGenerator'
import { ConflictError } from '@shared/errors/ConflictError'
import { Name } from '@valueObjects/Name'
import { AccessTokenService } from '@ports/AccessTokenService'
import { AuthService } from '@services/auth/AuthService'

interface RegisterClientResult {
  clientId: string
  accessToken: string
  refreshToken: string
}

@injectable()
export class RegisterClientHandler {
  constructor(
    @inject(ClientRepository)
    private readonly clients: ClientRepository,

    @inject(PasswordHasher)
    private readonly passwordHasher: PasswordHasher,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,

    @inject(AccessTokenService)
    private readonly authService: AuthService,
  ) {}

  async execute(command: RegisterClientCommand): Promise<RegisterClientResult> {
    const email = Email.create(command.email)

    const exists = await this.clients.findByEmail(email)
    if (exists) {
      throw new ConflictError(`Email already taken`, 'EMAIL_TAKEN', {
        email: email.toString(),
      })
    }

    Password.validateRaw(command.password)

    const hash = await this.passwordHasher.hash(command.password)
    const password = Password.fromHash(hash)

    const id = this.idGenerator.generate()

    const client = Client.create(id, Name.create(command.name), email, password)

    await this.clients.save(client)

    const tokens = await this.authService.login({
      clientId: client.id,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      deviceName: command.deviceName,
    })

    return { clientId: client.id, ...tokens }
  }
}

```

# File: src/application/commands/project/CreateNewApiKey/CreateNewApiKeyCommand.ts

```typescript
export class CreateNewApiKeyCommand {
  constructor(
    public readonly projectId: string,
    public readonly ownerId: string,
  ) {}
}

```

# File: src/application/commands/project/CreateNewApiKey/CreateNewApiKeyHandler.ts

```typescript

```

# File: src/application/commands/project/CreateProject/CreateProjectCommand.ts

```typescript
export class CreateProjectCommand {
  constructor(
    public readonly name: string,
    public readonly ownerId: string,
  ) {}
}

```

# File: src/application/commands/project/CreateProject/CreateProjectHandler.ts

```typescript
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { inject, injectable } from 'inversify'
import { CreateProjectCommand } from './CreateProjectCommand'
import { Project } from '@aggregates/project/Project'
import { ApiKeyService } from '@app/services/ApiKeyService'
import { IdGenerator } from '@ports/IdGenerator'
import { Name } from '@valueObjects/Name'

export interface CreateProjectResult {
  projectId: string
  apiKey: string
}

@injectable()
export class CreateProjectHandler {
  constructor(
    @inject(ProjectRepository)
    private readonly projects: ProjectRepository,

    @inject(ApiKeyService)
    private readonly apiKeyService: ApiKeyService,

    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateProjectCommand): Promise<CreateProjectResult> {
    const id = this.idGenerator.generate()

    const { apiKey, rawKey } = this.apiKeyService.create(Name.create(command.name))

    const project = Project.create(id, Name.create(command.name), command.ownerId, apiKey)

    await this.projects.save(project)

    return { projectId: project.id, apiKey: rawKey }
  }
}

```

# File: src/application/factories/RefreshTokenFactory.ts

```typescript
import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import { IdGenerator } from '@ports/IdGenerator'
import type { GeneratedRefreshToken } from '@services/refresh-token/types'
import { injectable, inject } from 'inversify'

interface CreateRefreshToken {
  sessionId: string
  refresh: GeneratedRefreshToken
}

@injectable()
export class RefreshTokenFactory {
  constructor(
    @inject(IdGenerator)
    private readonly idGenerator: IdGenerator,
  ) {}
  create(params: CreateRefreshToken): RefreshToken {
    return RefreshToken.create(
      this.idGenerator.generate(),
      params.sessionId,
      params.refresh.hash,
      params.refresh.expiresAt,
    )
  }
}

```

# File: src/application/factories/SessionFactory.ts

```typescript
import { Session } from '@aggregates/session/Session'
import { IdGenerator } from '@ports/IdGenerator'
import { inject, injectable } from 'inversify'

interface CreateSessionParams {
  clientId: string
  expiresAt: Date
  userAgent: string | null
  ipAddress: string | null
  deviceName: string | null
}

@injectable()
export class SessionFactory {
  constructor(@inject(IdGenerator) private readonly idGenerator: IdGenerator) {}

  create(params: CreateSessionParams): Session {
    return Session.create(
      this.idGenerator.generate(),
      params.clientId,
      params.expiresAt,
      params.userAgent,
      params.ipAddress,
      params.deviceName,
    )
  }
}

```

# File: src/application/services/ApiKeyService.ts

```typescript
import { ApiKey } from '@aggregates/project/ApiKey'
import { Hasher } from '@ports/Hasher'
import { IdGenerator } from '@ports/IdGenerator'
import { KeyGenerator } from '@ports/KeyGenerator'
import { Name } from '@valueObjects/Name'
import { timingSafeEqual } from 'crypto'
import { inject, injectable } from 'inversify'

@injectable()
export class ApiKeyService {
  constructor(
    @inject(IdGenerator) private readonly idGenerator: IdGenerator,
    @inject(Hasher) private readonly hasher: Hasher,
    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
  ) {}

  create(name: Name): { apiKey: ApiKey; rawKey: string } {
    const rawKey = this.keyGenerator.generate()
    const hash = this.hasher.hash(rawKey)
    return {
      apiKey: new ApiKey(this.idGenerator.generate(), name, hash, false, new Date()),
      rawKey,
    }
  }

  verify(rawKey: string, hash: string): boolean {
    const computed = this.hasher.hash(rawKey)
    if (computed.length !== hash.length) return false
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  }
}

```

# File: src/application/services/auth/AuthService.ts

```typescript
import type { TokenPair } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenHandler'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { RefreshTokenService } from '../refresh-token/RefreshTokenService'
import { AccessTokenService } from '@ports/AccessTokenService'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { RefreshTokenFactory } from '@app/factories/RefreshTokenFactory'
import { SessionFactory } from '@app/factories/SessionFactory'
import { RefreshTokenRepository } from '@aggregates/refreshToken/RefreshTokenRepository'
import { LoginContext } from './types'

@injectable()
export class AuthService {
  constructor(
    @inject(RefreshTokenService)
    private readonly refreshTokenService: RefreshTokenService,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,

    @inject(AccessTokenService)
    private readonly accessTokenService: AccessTokenService,

    @inject(SessionFactory)
    private readonly sessionFactory: SessionFactory,

    @inject(RefreshTokenFactory)
    private readonly refreshFactory: RefreshTokenFactory,

    @inject(RefreshTokenRepository)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async refresh(rawToken: string): Promise<TokenPair> {
    const token = await this.refreshTokenService.requireValid(rawToken)

    await this.refreshTokenService.detectReuse(token)

    const session = await this.sessions.findById(token.sessionId)

    if (!session?.isActive()) {
      throw new UnauthorizedError('Session is invalid or has been revoked')
    }

    const refresh = await this.refreshTokenService.rotate(token)

    await this.sessions.save(session.touch())

    return {
      accessToken: this.accessTokenService.sign(session.clientId, session.id),
      refreshToken: refresh.rawRefreshToken,
    }
  }

  async login(context: LoginContext): Promise<TokenPair> {
    const refreshData = this.refreshTokenService.generate()

    const session = this.sessionFactory.create({
      clientId: context.clientId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      deviceName: context.deviceName,
      expiresAt: refreshData.expiresAt,
    })

    const refreshToken = this.refreshFactory.create({
      sessionId: session.id,
      refresh: refreshData,
    })

    await this.sessions.save(session)

    await this.refreshTokens.save(refreshToken)

    const accessToken = this.accessTokenService.sign(context.clientId, session.id)

    return { accessToken, refreshToken: refreshData.rawRefreshToken }
  }
}

```

# File: src/application/services/auth/types.ts

```typescript
export interface LoginContext {
  clientId: string
  userAgent: string | null
  ipAddress: string | null
  deviceName: string | null
}

```

# File: src/application/services/refresh-token/RefreshTokenService.ts

```typescript
import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import { RefreshTokenRepository } from '@aggregates/refreshToken/RefreshTokenRepository'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { inject, injectable } from 'inversify'
import { Hasher } from '@ports/Hasher'
import { KeyGenerator } from '@ports/KeyGenerator'
import { ServerConfig } from '@config/server'
import { RefreshTokenFactory } from '@app/factories/RefreshTokenFactory'
import type { GeneratedRefreshToken } from './types'

@injectable()
export class RefreshTokenService {
  constructor(
    @inject(RefreshTokenRepository)
    private readonly refreshTokens: RefreshTokenRepository,

    @inject(RefreshTokenFactory)
    private readonly refreshFactory: RefreshTokenFactory,

    @inject(Hasher)
    private readonly hasher: Hasher,

    @inject(ServerConfig) private readonly config: ServerConfig,

    @inject(KeyGenerator) private readonly keyGenerator: KeyGenerator,
  ) {}

  async requireValid(rawToken: string): Promise<RefreshToken> {
    const hash = this.hasher.hash(rawToken)

    const token = await this.refreshTokens.findByHash(hash)

    if (!token) {
      throw new UnauthorizedError('Refresh token is invalid', 'REFRESH_TOKEN_INVALID')
    }

    if (token.isExpired()) {
      throw new UnauthorizedError('Expired refresh token')
    }

    if (token.isRevoked()) {
      throw new UnauthorizedError('Revoked refresh token')
    }

    return token
  }

  async detectReuse(token: RefreshToken): Promise<void> {
    if (token.isUsed()) {
      await this.refreshTokens.revokeAllBySessionId(token.sessionId)

      throw new UnauthorizedError('Refresh token reuse detected', 'REFRESH_TOKEN_REUSE_DETECTED')
    }
  }

  async rotate(currentToken: RefreshToken): Promise<GeneratedRefreshToken> {
    await this.refreshTokens.save(currentToken.markAsUsed())

    const refreshData = this.generate()

    const refreshToken = this.refreshFactory.create({
      sessionId: currentToken.sessionId,
      refresh: refreshData,
    })

    await this.refreshTokens.save(refreshToken)

    return refreshData
  }

  generate(): GeneratedRefreshToken {
    const rawRefreshToken = this.keyGenerator.generate()

    return {
      rawRefreshToken,
      hash: this.hasher.hash(rawRefreshToken),
      expiresAt: new Date(Date.now() + this.config.refreshTokenTtlMs),
    }
  }
}

```

# File: src/application/services/refresh-token/types.ts

```typescript
export interface GeneratedRefreshToken {
  rawRefreshToken: string
  hash: string
  expiresAt: Date
}

```

# File: src/application.ts

```typescript
import 'reflect-metadata'
import http from 'http'
import { ServerConfig } from './config/server'
import { inject, injectable } from 'inversify'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { InternalServerError } from '@shared/errors/InternalServerError'

@injectable()
export class Application {
  private server?: http.Server

  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,

    @inject(HttpServerFactory)
    private readonly httpServerFactory: HttpServerFactory,
  ) {}

  init(): void {
    this.server = this.httpServerFactory.create()
  }

  async start(): Promise<void> {
    const { port } = this.config

    await new Promise<void>((resolve) => {
      this.getHttpServer().listen(port, resolve)
    })

    console.log(`Server started on ${String(port)}`)
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.getHttpServer().close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
  private getHttpServer(): http.Server {
    if (!this.server) {
      throw new InternalServerError('HTTP server is not initialized')
    }

    return this.server
  }
}

```

# File: src/bootstrap.ts

```typescript
import 'reflect-metadata'
import { Container } from 'inversify'
import { Application } from './application'
import { ApplicationContext } from './contexts/ApplicationContext'
import { InfrastructureContext } from './contexts/InfrastructureContext'
import { ServiceContextBuilder } from './contexts/ServiceContextBuilder'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Bootstrap {
  public static bootstrap(): Application {
    const container = new Container()

    new ServiceContextBuilder(container, [
      new ApplicationContext(),
      new InfrastructureContext(),
    ]).build()

    const app = container.get(Application)

    app.init()

    return app
  }
}

export const bootstrap = async (): Promise<void> => {
  try {
    const application = Bootstrap.bootstrap()
    await application.start()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

```

# File: src/config/server.ts

```typescript
import { InternalServerError } from '@shared/errors/InternalServerError'
import { injectable } from 'inversify'

@injectable()
export class ServerConfig {
  get port(): number {
    const raw = process.env['HTTP_PORT']
    if (raw === undefined) return 8080

    const port = Number(raw)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InternalServerError(
        `Invalid HTTP_PORT: "${raw}". Must be integer between 1 and 65535.`,
      )
    }

    return port
  }

  get bcryptRounds(): number {
    const raw = process.env['BCRYPT_ROUNDS']
    if (raw === undefined) return 12

    const rounds = Number(raw)
    if (!Number.isInteger(rounds) || rounds < 10 || rounds > 31) {
      throw new InternalServerError(
        `Invalid BCRYPT_ROUNDS: "${raw}". Must be integer between 10 and 31.`,
      )
    }

    return rounds
  }

  get jwtSecret(): string {
    const secret = process.env['JWT_SECRET']
    if (!secret || secret.length < 32) {
      throw new InternalServerError('JWT_SECRET must be set and at least 32 characters long')
    }
    return secret
  }

  get jwtExpiresIn(): string {
    return process.env['JWT_EXPIRES_IN'] ?? '1h'
  }

  get refreshTokenTtlMs(): number {
    const raw = process.env['REFRESH_TOKEN_TTL_MS']
    if (raw === undefined) return 30 * 24 * 60 * 60 * 1000

    const ms = Number(raw)
    if (!Number.isInteger(ms) || ms < 1) {
      throw new InternalServerError(
        `Invalid REFRESH_TOKEN_TTL_MS: "${raw}". Must be positive integer.`,
      )
    }
    return ms
  }
}

```

# File: src/contexts/ApplicationContext.ts

```typescript
import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { Container, injectable } from 'inversify'
import { ServiceContext } from './ServiceContext'
import { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { LogoutAllSessionsHandler } from '@app/commands/client/LogoutAllSessions/LogoutAllSessionsHandler'
import { RefreshAccessTokenHandler } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenHandler'

@injectable()
export class ApplicationContext implements ServiceContext {
  register(container: Container): void {
    container.bind(RegisterClientHandler).toSelf()

    container.bind(LoginClientHandler).toSelf()

    container.bind(ChangeClientPasswordHandler).toSelf()

    container.bind(ChangeClientEmailHandler).toSelf()

    container.bind(LogoutAllSessionsHandler).toSelf()

    container.bind(RefreshAccessTokenHandler).toSelf()

    container.bind(CreateProjectHandler).toSelf()
  }
}

```

# File: src/contexts/InfrastructureContext.ts

```typescript
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { BcryptPasswordHasher } from '@infra/crypto/BcryptIPasswordHasher'
import { CryptoHasher } from '@infra/crypto/CryptoHasher'
import { UuidIdGenerator } from '@infra/identity/UuidIdGenerator'
import { PrismaClientRepository } from '@infra/persistence/client/PrismaClientRepository'
import { PrismaProjectRepository } from '@infra/persistence/project/PrismaProjectRepository'
import { Hasher } from '@ports/Hasher'
import { IdGenerator } from '@ports/IdGenerator'
import { PasswordHasher } from '@ports/PasswordHasher'
import { Container, injectable } from 'inversify'
import { ServiceContext } from './ServiceContext'
import { SessionFactory } from '@app/factories/SessionFactory'
import { ApiKeyService } from '@app/services/ApiKeyService'
import { ServerConfig } from '@config/server'
import { CryptoKeyGenerator } from '@infra/crypto/CryptoKeyGenerator'
import { ExpressApp } from '@infra/http/ExpressApp'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { JwtAccessTokenService } from '@infra/jwt/JwtAccessTokenService'
import { AccessTokenService } from '@ports/AccessTokenService'
import { KeyGenerator } from '@ports/KeyGenerator'
import { PrismaClient } from '@generated/prisma/client'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { PrismaSessionRepository } from '@infra/persistence/session/PrismaSessionRepository'
import { RefreshTokenFactory } from '@factories/RefreshTokenFactory'

@injectable()
export class InfrastructureContext implements ServiceContext {
  register(container: Container): void {
    container.bind(ServerConfig).toSelf().inSingletonScope()

    container.bind(PrismaClient).toSelf()

    container.bind(ExpressApp).toSelf().inSingletonScope()

    container.bind(HttpServerFactory).toSelf().inSingletonScope()

    container.bind(ClientRepository).to(PrismaClientRepository).inSingletonScope()

    container.bind(ProjectRepository).to(PrismaProjectRepository).inSingletonScope()

    container.bind(SessionRepository).to(PrismaSessionRepository).inSingletonScope()

    container.bind(PasswordHasher).to(BcryptPasswordHasher).inSingletonScope()

    container.bind(Hasher).to(CryptoHasher).inSingletonScope()

    container.bind(KeyGenerator).to(CryptoKeyGenerator).inSingletonScope()

    container.bind(IdGenerator).to(UuidIdGenerator).inSingletonScope()

    container.bind(AccessTokenService).to(JwtAccessTokenService).inSingletonScope()

    container.bind(ApiKeyService).toSelf().inSingletonScope()

    container.bind(SessionFactory).toSelf().inSingletonScope()
    container.bind(RefreshTokenFactory).toSelf().inSingletonScope()
  }
}

```

# File: src/contexts/ServiceContext.ts

```typescript
import type { Container } from 'inversify'

export interface ServiceContext {
  register(container: Container): void
}

```

# File: src/contexts/ServiceContextBuilder.ts

```typescript
import type { Container } from 'inversify'
import type { ServiceContext } from './ServiceContext'

export class ServiceContextBuilder {
  constructor(
    private readonly container: Container,
    private readonly contexts: ServiceContext[],
  ) {}

  build(): void {
    for (const context of this.contexts) {
      context.register(this.container)
    }
  }
}

```

# File: src/domain/aggregates/client/Client.ts

```typescript
import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { Email } from './Email'
import type { Password } from './Password'
import type { Name } from '@valueObjects/Name'

export class Client extends AggregateRoot {
  private constructor(
    id: string,
    private _name: Name,
    private _email: Email,
    private _password: Password,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get email(): Email {
    return this._email
  }

  get name(): string {
    return this._name.getValue()
  }

  get password(): Password {
    return this._password
  }

  static create(id: string, name: Name, email: Email, password: Password): Client {
    const client = new Client(id, name, email, password, new Date())
    // client.addDomainEvent({ eventName: 'ClientRegistered', occurredAt: new Date() })
    return client
  }

  static reconstruct(
    id: string,
    name: Name,
    email: Email,
    password: Password,
    createdAt: Date,
  ): Client {
    return new Client(id, name, email, password, createdAt)
  }

  reName(newName: Name): Client {
    return new Client(this.id, newName, this._email, this._password, this.createdAt)
  }

  changeEmail(newEmail: Email): Client {
    return new Client(this.id, this._name, newEmail, this._password, this.createdAt)
  }

  changePassword(newPassword: Password): Client {
    return new Client(this.id, this._name, this._email, newPassword, this.createdAt)
  }
}

```

# File: src/domain/aggregates/client/ClientRepository.ts

```typescript
import type { Client } from './Client'
import type { Email } from './Email'

export interface ClientRepository {
  findById(id: string): Promise<Client | null>
  findByEmail(email: Email): Promise<Client | null>
  save(client: Client): Promise<void>
}

export const ClientRepository: unique symbol = Symbol('ClientRepository')

```

# File: src/domain/aggregates/client/Email.ts

```typescript
import { ValueObject } from '@libs/ddd/ValueObject'
import { ValidationError } from '@shared/errors/ValidationError'

export class Email extends ValueObject<Email> {
  private constructor(private readonly value: string) {
    super()
  }

  static create(raw: string): Email {
    const trimmed = raw.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new ValidationError('Invalid email format', 'INVALID_EMAIL_FORMAT', {
        email: trimmed,
      })
    }
    return new Email(trimmed)
  }

  copy(): Email {
    return new Email(this.value)
  }

  override toString(): string {
    return this.value
  }
}

```

# File: src/domain/aggregates/client/Password.ts

```typescript
import { ValueObject } from '@libs/ddd/ValueObject'
import { ValidationError } from '@shared/errors/ValidationError'

export class Password extends ValueObject<Password> {
  private constructor(private readonly hash: string) {
    super()
  }

  static validateRaw(raw: string): void {
    if (!raw || raw.length < 8)
      throw new ValidationError(
        'Invalid password: must be at least 8 characters long',
        'INVALID_PASSWORD_LENGTH',
        {
          minLength: 8,
          actualLength: raw.length,
        },
      )
    if (raw.length > 128)
      throw new ValidationError(
        'Invalid password: must not exceed 128 characters',
        'INVALID_PASSWORD_LENGTH',
        {
          maxLength: 128,
          actualLength: raw.length,
        },
      )
  }

  static fromHash(hash: string): Password {
    if (!hash) throw new ValidationError('Invalid password hash', 'INVALID_PASSWORD_HASH')

    if (!/^\$2[aby]?\$/.test(hash))
      throw new ValidationError('Invalid password hash format', 'INVALID_PASSWORD_HASH_FORMAT')

    return new Password(hash)
  }

  getHash(): string {
    return this.hash
  }

  copy(): Password {
    return new Password(this.hash)
  }

  override toString(): string {
    return '[REDACTED]'
  }
}

```

# File: src/domain/aggregates/project/ApiKey.ts

```typescript
import { Identifiable } from '@libs/ddd/Identifiable'
import type { Name } from '@valueObjects/Name'

export class ApiKey extends Identifiable {
  constructor(
    id: string,
    private _name: Name,
    public readonly hash: string,
    public readonly revoked: boolean,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get name(): string {
    return this._name.getValue()
  }

  static reconstruct(
    id: string,
    name: Name,
    hash: string,
    revoked: boolean,
    createdAt: Date,
  ): ApiKey {
    return new ApiKey(id, name, hash, revoked, createdAt)
  }

  revoke(): ApiKey {
    return new ApiKey(this.id, this._name, this.hash, true, this.createdAt)
  }

  reName(newName: Name): ApiKey {
    return new ApiKey(this.id, newName, this.hash, this.revoked, this.createdAt)
  }
}

```

# File: src/domain/aggregates/project/Project.ts

```typescript
import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { ApiKey } from './ApiKey'
import type { Name } from '@valueObjects/Name'

export class Project extends AggregateRoot {
  private constructor(
    id: string,
    private _name: Name,
    public readonly ownerId: string,
    private _apiKey: ApiKey,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get name(): string {
    return this._name.getValue()
  }

  get apiKey(): ApiKey {
    return this._apiKey
  }

  static create(id: string, name: Name, ownerId: string, apiKey: ApiKey): Project {
    return new Project(id, name, ownerId, apiKey, new Date())
  }

  static reconstruct(
    id: string,
    name: Name,
    ownerId: string,
    apiKey: ApiKey,
    createdAt: Date,
  ): Project {
    return new Project(id, name, ownerId, apiKey, createdAt)
  }

  revokeApiKey(): void {
    this._apiKey = this._apiKey.revoke()
  }

  reName(newName: Name): void {
    this._name = newName
  }

  reNameApiKey(newName: Name): void {
    this._apiKey = this._apiKey.reName(newName)
  }
}

```

# File: src/domain/aggregates/project/ProjectRepository.ts

```typescript
import type { Project } from './Project'

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>
  findByOwnerId(ownerId: string): Promise<Project[]>
  save(project: Project): Promise<void>
}

export const ProjectRepository: unique symbol = Symbol('ProjectRepository')

```

# File: src/domain/aggregates/refreshToken/RefreshToken.ts

```typescript
import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class RefreshToken extends AggregateRoot {
  private constructor(
    id: string,

    public readonly sessionId: string,

    private readonly _hash: string,

    private readonly _usedAt: Date | null,
    private readonly _revokedAt: Date | null,

    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  static create(id: string, sessionId: string, hash: string, expiresAt: Date): RefreshToken {
    return new RefreshToken(id, sessionId, hash, null, null, expiresAt, new Date())
  }

  static reconstruct(
    id: string,
    sessionId: string,
    hash: string,
    usedAt: Date | null,
    revokedAt: Date | null,
    expiresAt: Date,
    createdAt: Date,
  ): RefreshToken {
    return new RefreshToken(id, sessionId, hash, usedAt, revokedAt, expiresAt, createdAt)
  }

  get hash(): string {
    return this._hash
  }

  get usedAt(): Date | null {
    return this._usedAt
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  isUsed(): boolean {
    return this._usedAt !== null
  }

  isRevoked(): boolean {
    return this._revokedAt !== null
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date()
  }

  isActive(): boolean {
    return !this.isUsed() && !this.isRevoked() && !this.isExpired()
  }

  markAsUsed(): RefreshToken {
    return new RefreshToken(
      this.id,
      this.sessionId,
      this._hash,
      new Date(),
      this._revokedAt,
      this.expiresAt,
      this.createdAt,
    )
  }

  revoke(): RefreshToken {
    return new RefreshToken(
      this.id,
      this.sessionId,
      this._hash,
      this._usedAt,
      new Date(),
      this.expiresAt,
      this.createdAt,
    )
  }
}

```

# File: src/domain/aggregates/refreshToken/RefreshTokenRepository.ts

```typescript
import type { RefreshToken } from './RefreshToken'

export interface RefreshTokenRepository {
  save(token: RefreshToken): Promise<void>

  findById(id: string): Promise<RefreshToken | null>

  findByHash(hash: string): Promise<RefreshToken | null>

  findBySessionId(sessionId: string): Promise<RefreshToken[]>

  revokeAllBySessionId(sessionId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const RefreshTokenRepository = Symbol('RefreshTokenRepository')

```

# File: src/domain/aggregates/session/Session.ts

```typescript
import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class Session extends AggregateRoot {
  private constructor(
    id: string,
    public readonly clientId: string,

    public readonly expiresAt: Date,
    private readonly _revokedAt: Date | null,

    public readonly createdAt: Date,
    public readonly lastUsedAt: Date,

    public readonly userAgent: string | null,
    public readonly ipAddress: string | null,
    public readonly deviceName: string | null,
  ) {
    super(id)
  }

  static create(
    id: string,
    clientId: string,
    expiresAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): Session {
    const now = new Date()

    return new Session(id, clientId, expiresAt, null, now, now, userAgent, ipAddress, deviceName)
  }

  static reconstruct(
    id: string,
    clientId: string,
    expiresAt: Date,
    revokedAt: Date | null,
    createdAt: Date,
    lastUsedAt: Date,
    userAgent: string | null,
    ipAddress: string | null,
    deviceName: string | null,
  ): Session {
    return new Session(
      id,
      clientId,
      expiresAt,
      revokedAt,
      createdAt,
      lastUsedAt,
      userAgent,
      ipAddress,
      deviceName,
    )
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  isExpired(): boolean {
    return this.expiresAt <= new Date()
  }

  isRevoked(): boolean {
    return this._revokedAt !== null
  }

  isActive(): boolean {
    return !this.isExpired() && !this.isRevoked()
  }

  revoke(): Session {
    return new Session(
      this.id,
      this.clientId,
      this.expiresAt,
      new Date(),
      this.createdAt,
      this.lastUsedAt,
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }

  touch(): Session {
    return new Session(
      this.id,
      this.clientId,
      this.expiresAt,
      this._revokedAt,
      this.createdAt,
      new Date(),
      this.userAgent,
      this.ipAddress,
      this.deviceName,
    )
  }
}

```

# File: src/domain/aggregates/session/SessionRepository.ts

```typescript
import type { Session } from './Session'

export interface SessionRepository {
  save(session: Session): Promise<void>

  findById(id: string): Promise<Session | null>

  findByClientId(clientId: string): Promise<Session[]>

  revokeAllByClientId(clientId: string): Promise<void>

  deleteExpired(): Promise<void>
}

export const SessionRepository: unique symbol = Symbol('SessionRepository')

```

# File: src/domain/ports/AccessTokenService.ts

```typescript
export interface AccessTokenPayload {
  clientId: string
  sessionId: string
}

export interface AccessTokenService {
  sign(clientId: string, sessionId: string): string
  verify(token: string): AccessTokenPayload
}

export const AccessTokenService: unique symbol = Symbol('AccessTokenService')

```

# File: src/domain/ports/Hasher.ts

```typescript
export interface Hasher {
  hash(value: string): string
}

export const Hasher: unique symbol = Symbol('Hasher')

```

# File: src/domain/ports/IdGenerator.ts

```typescript
export interface IdGenerator {
  generate(): string
}

export const IdGenerator: unique symbol = Symbol('IdGenerator')

```

# File: src/domain/ports/KeyGenerator.ts

```typescript
export interface KeyGenerator {
  generate(bytes?: number, encoding?: BufferEncoding): string
}

export const KeyGenerator: unique symbol = Symbol('KeyGenerator')

```

# File: src/domain/ports/PasswordHasher.ts

```typescript
export interface PasswordHasher {
  hash(raw: string): Promise<string>
  verify(raw: string, hash: string): Promise<boolean>
}

export const PasswordHasher: unique symbol = Symbol('PasswordHasher')

```

# File: src/domain/valueObjects/Name.ts

```typescript
import { ValidationError } from '@shared/errors/ValidationError'
import { NameVO } from '@libs/ddd/VO/NameVO'

export class Name extends NameVO<Name> {
  private constructor(value: string) {
    super(value)
  }

  static create(name: string): Name {
    const trimmed = name.trim()

    if (trimmed.length < 8 || trimmed.length > 64) {
      throw new ValidationError(
        'Invalid name: must be 8-64 characters long',
        'INVALID_NAME_LENGTH',
        {
          minLength: 8,
          maxLength: 64,
          actualLength: trimmed.length,
        },
      )
    }

    if (!/^[\p{L}\p{N} '_-]+$/u.test(trimmed)) {
      throw new ValidationError(
        'Invalid name: contains forbidden characters',
        'INVALID_NAME_CHARACTERS',
        {
          forbiddenCharacters: trimmed.match(/[^\p{L}\p{N} '_-]/gu),
          name: trimmed,
        },
      )
    }

    return new Name(trimmed)
  }
}

```

# File: src/infrastructure/crypto/BcryptIPasswordHasher.ts

```typescript
import type { PasswordHasher } from '@ports/PasswordHasher'
import { ServerConfig } from '@config/server'
import bcrypt from 'bcrypt'
import { inject, injectable } from 'inversify'

@injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  async hash(raw: string): Promise<string> {
    return await bcrypt.hash(raw, this.config.bcryptRounds)
  }

  async verify(raw: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(raw, hash)
  }
}

```

# File: src/infrastructure/crypto/CryptoHasher.ts

```typescript
import type { Hasher } from '@ports/Hasher'
import { createHash } from 'crypto'
import type { BinaryToTextEncoding } from 'crypto'
import { injectable } from 'inversify'

@injectable()
export class CryptoHasher implements Hasher {
  constructor(
    private readonly algorithm = 'sha256',
    private readonly encoding: BinaryToTextEncoding = 'hex',
  ) {}
  hash(value: string): string {
    return createHash(this.algorithm).update(value).digest(this.encoding)
  }
}

```

# File: src/infrastructure/crypto/CryptoKeyGenerator.ts

```typescript
import type { KeyGenerator } from '@ports/KeyGenerator'
import { randomBytes } from 'crypto'
import { injectable } from 'inversify'

@injectable()
export class CryptoKeyGenerator implements KeyGenerator {
  generate(bytes = 32, encoding: BufferEncoding = 'hex'): string {
    return randomBytes(bytes).toString(encoding)
  }
}

```

# File: src/infrastructure/http/ExpressApp.ts

```typescript
import cookieParser from 'cookie-parser'
import express, { Express } from 'express'
import helmet from 'helmet'
import { injectable } from 'inversify'

@injectable()
export class ExpressApp {
  private readonly app: Express

  constructor() {
    this.app = express()
    this.setup()
  }

  private setup(): void {
    this.app.use(express.json())
    this.app.use(helmet())
    this.app.use(cookieParser())
  }

  getInstance(): Express {
    return this.app
  }
}

```

# File: src/infrastructure/http/HttpServerFactory.ts

```typescript
import http from 'http'
import { inject, injectable } from 'inversify'

import { ExpressApp } from './ExpressApp'

@injectable()
export class HttpServerFactory {
  constructor(
    @inject(ExpressApp)
    private readonly expressApp: ExpressApp,
  ) {}

  create(): http.Server {
    return http.createServer(this.expressApp.getInstance())
  }
}

```

# File: src/infrastructure/identity/UuidIdGenerator.ts

```typescript
import type { IdGenerator } from '@ports/IdGenerator'
import { v4 as uuid } from 'uuid'
import { injectable } from 'inversify'

@injectable()
export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return uuid()
  }
}

```

# File: src/infrastructure/jwt/JwtAccessTokenService.ts

```typescript
import type { AccessTokenPayload, AccessTokenService } from '@ports/AccessTokenService'
import { ServerConfig } from '@config/server'
import { inject, injectable } from 'inversify'
import jwt from 'jsonwebtoken'
import { ValidationError } from '@shared/errors/ValidationError'

@injectable()
export class JwtAccessTokenService implements AccessTokenService {
  constructor(
    @inject(ServerConfig)
    private readonly config: ServerConfig,
  ) {}

  sign(clientId: string, sessionId: string): string {
    const expiresIn = this.config.jwtExpiresIn as jwt.SignOptions['expiresIn'] & string
    return jwt.sign({ sub: clientId, sid: sessionId }, this.config.jwtSecret, { expiresIn })
  }

  verify(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, this.config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'auth-system',
    })
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload['sid'] !== 'string'
    ) {
      throw new ValidationError('Invalid token payload', 'INVALID_TOKEN_PAYLOAD')
    }
    return {
      clientId: payload.sub,
      sessionId: payload['sid'],
    }
  }
}

```

# File: src/infrastructure/persistence/client/ClientMapper.ts

```typescript
import { Client } from '@aggregates/client/Client'
import { Email } from '@aggregates/client/Email'
import { Password } from '@aggregates/client/Password'
import type { Prisma } from '@generated/prisma/client'
import { Name } from '@valueObjects/Name'

type PrismaClientRow = Prisma.ClientGetPayload<Record<string, never>>

export function clientToDomain(raw: PrismaClientRow): Client {
  return Client.reconstruct(
    raw.id,
    Name.create(raw.name),
    Email.create(raw.email),
    Password.fromHash(raw.passwordHash),
    raw.createdAt,
  )
}

```

# File: src/infrastructure/persistence/client/PrismaClientRepository.ts

```typescript
import { ClientRepository } from '@aggregates/client/ClientRepository'
import { PrismaClient } from '@generated/prisma/client'
import { injectable } from 'inversify'
import { Email } from '@aggregates/client/Email'
import { Client } from '@aggregates/client/Client'
import { clientToDomain } from './ClientMapper'

@injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Client | null> {
    const raw = await this.prisma.client.findUnique({ where: { id } })
    return raw ? clientToDomain(raw) : null
  }

  async findByEmail(email: Email): Promise<Client | null> {
    const raw = await this.prisma.client.findUnique({
      where: { email: email.toString() },
    })
    return raw ? clientToDomain(raw) : null
  }

  async save(client: Client): Promise<void> {
    await this.prisma.client.upsert({
      where: { id: client.id },
      update: {
        name: client.name,
        email: client.email.toString(),
        passwordHash: client.password.getHash(),
      },
      create: {
        id: client.id,
        name: client.name,
        email: client.email.toString(),
        passwordHash: client.password.getHash(),
      },
    })
  }
}

```

# File: src/infrastructure/persistence/project/PrismaProjectRepository.ts

```typescript
import { injectable } from 'inversify'
import { PrismaClient } from '@generated/prisma/client'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { Project } from '@aggregates/project/Project'
import { projectToDomain } from './ProjectMapper'

@injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Project | null> {
    const raw = await this.prisma.project.findUnique({
      where: { id },
      include: { apiKey: true },
    })
    return raw ? projectToDomain(raw) : null
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    const raws = await this.prisma.project.findMany({
      where: { ownerId },
      include: { apiKey: true },
    })
    return raws.map(projectToDomain)
  }

  async save(project: Project): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.project.upsert({
        where: { id: project.id },
        create: {
          id: project.id,
          name: project.name,
          ownerId: project.ownerId,
          createdAt: project.createdAt,
        },
        update: { name: project.name },
      })

      await tx.apiKey.upsert({
        where: { projectId: project.id },
        create: {
          id: project.apiKey.id,
          name: project.apiKey.name,
          hash: project.apiKey.hash,
          revoked: project.apiKey.revoked,
          projectId: project.id,
        },
        update: { revoked: project.apiKey.revoked, hash: project.apiKey.hash },
      })
    })
  }
}

```

# File: src/infrastructure/persistence/project/ProjectMapper.ts

```typescript
import type { Prisma } from '@generated/prisma/client'
import { Project } from '@aggregates/project/Project'
import { ApiKey } from '@aggregates/project/ApiKey'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { Name } from '@valueObjects/Name'

type PrismaProjectWithApiKey = Prisma.ProjectGetPayload<{
  include: { apiKey: true }
}>

export function projectToDomain(raw: PrismaProjectWithApiKey): Project {
  if (!raw.apiKey)
    throw new NotFoundError('Project has no apiKey', 'PROJECT_HAS_NO_API_KEY', {
      projectId: raw.id,
    })

  const apiKey = ApiKey.reconstruct(
    raw.apiKey.id,
    Name.create(raw.apiKey.name),
    raw.apiKey.hash,
    raw.apiKey.revoked,
    raw.apiKey.createdAt,
  )

  return Project.reconstruct(raw.id, Name.create(raw.name), raw.ownerId, apiKey, raw.createdAt)
}

```

# File: src/infrastructure/persistence/refreshToken/PrismaRefreshTokenRepository.ts

```typescript
import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import type { RefreshTokenRepository } from '@aggregates/refreshToken/RefreshTokenRepository'
import { PrismaClient } from '@generated/prisma/client'
import { injectable } from 'inversify'
import { refreshTokenToDomain } from './RefreshTokenMapper'

@injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(token: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.upsert({
      where: {
        id: token.id,
      },
      update: {
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
        expiresAt: token.expiresAt,
      },
      create: {
        id: token.id,
        sessionId: token.sessionId,
        hash: token.hash,
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      },
    })
  }

  async findById(id: string): Promise<RefreshToken | null> {
    const raw = await this.prisma.refreshToken.findUnique({
      where: { id },
    })

    return raw ? refreshTokenToDomain(raw) : null
  }

  async findByHash(hash: string): Promise<RefreshToken | null> {
    const raw = await this.prisma.refreshToken.findUnique({
      where: { hash },
    })

    return raw ? refreshTokenToDomain(raw) : null
  }

  async findBySessionId(sessionId: string): Promise<RefreshToken[]> {
    const raws = await this.prisma.refreshToken.findMany({
      where: { sessionId },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return raws.map(refreshTokenToDomain)
  }

  async revokeAllBySessionId(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }
}

```

# File: src/infrastructure/persistence/refreshToken/RefreshTokenMapper.ts

```typescript
import { RefreshToken } from '@aggregates/refreshToken/RefreshToken'
import type { Prisma } from '@generated/prisma/client'

type PrismaRefreshTokenRow = Prisma.RefreshTokenGetPayload<Record<string, never>>

export function refreshTokenToDomain(raw: PrismaRefreshTokenRow): RefreshToken {
  return RefreshToken.reconstruct(
    raw.id,
    raw.sessionId,
    raw.hash,
    raw.usedAt,
    raw.revokedAt,
    raw.expiresAt,
    raw.createdAt,
  )
}

```

# File: src/infrastructure/persistence/session/PrismaSessionRepository.ts

```typescript
import { Session } from '@aggregates/session/Session'
import type { SessionRepository } from '@aggregates/session/SessionRepository'
import { PrismaClient } from '@generated/prisma/client'
import { injectable } from 'inversify'
import { sessionToDomain } from './SessionMapper'

@injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(session: Session): Promise<void> {
    await this.prisma.session.upsert({
      where: { id: session.id },
      update: {
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        lastUsedAt: session.lastUsedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceName: session.deviceName,
      },
      create: {
        id: session.id,
        clientId: session.clientId,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        deviceName: session.deviceName,
      },
    })
  }

  async findById(id: string): Promise<Session | null> {
    const raw = await this.prisma.session.findUnique({
      where: { id },
    })

    return raw ? sessionToDomain(raw) : null
  }

  async findByClientId(clientId: string): Promise<Session[]> {
    const raws = await this.prisma.session.findMany({
      where: { clientId },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return raws.map(sessionToDomain)
  }

  async revokeAllByClientId(clientId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        clientId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }
}

```

# File: src/infrastructure/persistence/session/SessionMapper.ts

```typescript
import { Session } from '@aggregates/session/Session'
import type { Prisma } from '@generated/prisma/client'

type PrismaSessionRow = Prisma.SessionGetPayload<Record<string, never>>

export function sessionToDomain(raw: PrismaSessionRow): Session {
  return Session.reconstruct(
    raw.id,
    raw.clientId,
    raw.expiresAt,
    raw.revokedAt,
    raw.createdAt,
    raw.lastUsedAt,
    raw.userAgent,
    raw.ipAddress,
    raw.deviceName,
  )
}

```

# File: src/libs/ddd/AggregateRoot.ts

```typescript
import { Identifiable } from './Identifiable'

export interface DomainEvent {
  readonly eventName: string
  readonly occurredAt: Date
}

export class AggregateRoot<T = string> extends Identifiable<T> {
  protected _events: DomainEvent[] = []

  get events(): readonly DomainEvent[] {
    return this._events
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._events.push(event)
  }

  clearDomainEvents(): void {
    this._events = []
  }
}

```

# File: src/libs/ddd/Identifiable.ts

```typescript
export abstract class Identifiable<T = string> {
  protected _id: T

  get id(): T {
    return this._id
  }

  protected constructor(id: T) {
    this._id = id
  }

  public sameIdentityAs(obj: Identifiable<T>): obj is this {
    return this._id === obj.id
  }

  public isTransient(): boolean {
    return !this._id
  }
}

```

# File: src/libs/ddd/ValueObject.ts

```typescript
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
export abstract class ValueObject<T> {
  protected constructor() {}

  public static getHashCode(object: any): number {
    const value: string = this.getAtomicString(object)

    let hash = 0

    for (let i = 0; i < value.length; i++) {
      const char: number = value.charCodeAt(i)
      hash = hash * 32 - hash + char

      hash &= hash
    }

    return hash
  }

  private static getAtomicString(object: any): string {
    return Object.entries(object)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => key + this.stringify(value))
      .join('')
  }

  private static stringify(value: any): string {
    if (value == null) {
      return ''
    }

    if (typeof value.getHashCode === 'function' && typeof value.getAtomicString === 'function') {
      return value.getAtomicString()
    }

    if (typeof value === 'object') {
      return this.getAtomicString(value)
    }

    return value.toString()
  }

  public sameValueAs(obj: ValueObject<T>): boolean {
    return this.getHashCode() === obj.getHashCode()
  }

  public toString(): string {
    return Object.entries(this)
      .map(([key, value]: [string, any]) => (value != null ? `${key}: ${value}` : ''))
      .join(', ')
  }

  public getHashCode(): number {
    return ValueObject.getHashCode(this)
  }

  protected getAtomicString(): string {
    return ValueObject.getAtomicString(this)
  }
}

```

# File: src/libs/ddd/VO/NameVO.ts

```typescript
import { ValueObject } from '../ValueObject'

export abstract class NameVO<T> extends ValueObject<T> {
  protected constructor(private readonly value: string) {
    super()
  }
  getValue(): string {
    return this.value
  }
}

```

# File: src/main.ts

```typescript
import { bootstrap } from './bootstrap'

void bootstrap()

```

# File: src/presentation/http/controllers/ClientController.ts

```typescript
import type { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientSchema } from '../validators/client/RegisterClientValidator'
import { RegisterClientCommand } from '@app/commands/client/RegisterClient/RegisterClientCommand'
import type { Request, Response } from 'express'
import { LoginClientSchema } from '../validators/client/LoginClientValidator'
import type { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { LoginClientCommand } from '@app/commands/client/LoginClient/LoginClientCommand'
import { ChangeClientEmailSchema } from '../validators/client/ChangeClientEmailValidator'
import type { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { ChangeClientEmailCommand } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailCommand'
import { ChangeClientPasswordSchema } from '../validators/client/ChangeClientPasswordValidator'
import type { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { ChangeClientPasswordCommand } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordCommand'
import type { LogoutAllSessionsHandler } from '@app/commands/client/LogoutAllSessions/LogoutAllSessionsHandler'
import { LogoutAllSessionsCommand } from '@app/commands/client/LogoutAllSessions/LogoutAllSessionsCommand'
import type { LogoutCurrentSessionHandler } from '@app/commands/client/LogoutCurrentSession/LogoutCurrentSessionHandler'
import { LogoutCurrentSessionCommand } from '@app/commands/client/LogoutCurrentSession/LogoutCurrentSessionCommand'
import type { RefreshAccessTokenHandler } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenHandler'
import { RefreshAccessTokenCommand } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenCommand'
import { RefreshTokenCookiesSchema } from '../validators/client/RefreshAccessTokenValidator'

export class ClientController {
  constructor(
    private readonly registerHandler: RegisterClientHandler,
    private readonly loginHandler: LoginClientHandler,
    private readonly changeEmailHandler: ChangeClientEmailHandler,
    private readonly changePasswordHandler: ChangeClientPasswordHandler,
    private readonly logoutAllHandler: LogoutAllSessionsHandler,
    private readonly logoutCurrentHandler: LogoutCurrentSessionHandler,
    private readonly refreshHandler: RefreshAccessTokenHandler,
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterClientSchema.parse(req.body)

    const result = await this.registerHandler.execute(
      new RegisterClientCommand(
        body.name,
        body.email,
        body.password,
        req.headers['user-agent'] ?? null,
        req.ip ?? null,
        body.deviceName ?? null,
      ),
    )

    res.status(201).json(result)
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = LoginClientSchema.parse(req.body)

    const result = await this.loginHandler.execute(
      new LoginClientCommand(
        body.password,
        body.email,
        req.headers['user-agent'] ?? null,
        req.ip ?? null,
        body.deviceName ?? null,
      ),
    )

    res.status(201).json(result)
  }

  async changeEmail(req: Request, res: Response): Promise<void> {
    const body = ChangeClientEmailSchema.parse(req.body)

    const result = await this.changeEmailHandler.execute(
      new ChangeClientEmailCommand(req.auth.clientId, body.newEmail, body.password),
    )

    res.status(200).json(result)
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const body = ChangeClientPasswordSchema.parse(req.body)

    const result = await this.changePasswordHandler.execute(
      new ChangeClientPasswordCommand(req.auth.clientId, body.currentPassword, body.newPassword),
    )

    res.status(200).json(result)
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const result = await this.logoutAllHandler.execute(
      new LogoutAllSessionsCommand(req.auth.sessionId, req.auth.clientId),
    )
    res.status(200).json(result)
  }

  async logoutCurrent(req: Request, res: Response): Promise<void> {
    const result = await this.logoutCurrentHandler.execute(
      new LogoutCurrentSessionCommand(req.auth.sessionId, req.auth.clientId),
    )
    res.status(200).json(result)
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const cookies = RefreshTokenCookiesSchema.parse(req.cookies)

    const result = await this.refreshHandler.execute(
      new RefreshAccessTokenCommand(cookies.refresh_token),
    )

    res.status(200).json(result)
  }
}

```

# File: src/presentation/http/middleware/AuthMiddleware.ts

```typescript
import type { NextFunction, Response, Request } from 'express'
import { inject, injectable } from 'inversify'

import { SessionRepository } from '@aggregates/session/SessionRepository'
import { AccessTokenService } from '@ports/AccessTokenService'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

// import type { AuthenticatedRequest } from '../types/AuthenticatedRequest'

@injectable()
export class AuthMiddleware {
  constructor(
    @inject(AccessTokenService)
    private readonly accessTokens: AccessTokenService,

    @inject(SessionRepository)
    private readonly sessions: SessionRepository,
  ) {}

  async authenticate(req: Request, _: Response, next: NextFunction): Promise<void> {
    const header = req.header('authorization')

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing bearer token')
    }

    const token = header.substring(7)

    const payload = this.accessTokens.verify(token)

    const session = await this.sessions.findById(payload.sessionId)

    if (!session) {
      throw new UnauthorizedError('Session not found')
    }

    if (!session.isActive()) {
      throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED')
    }

    if (session.clientId !== payload.clientId) {
      throw new UnauthorizedError('Invalid session')
    }

    req.auth = payload

    next()
  }
}

```

# File: src/presentation/http/routes/client.ts

```typescript
import { Router } from 'express'
import type { ClientController } from '../controllers/ClientController'
import type { AuthMiddleware } from '../middleware/AuthMiddleware'

export class ClientRouter {
  constructor(
    private readonly controller: ClientController,
    private readonly auth: AuthMiddleware,
  ) {}
  build(): Router {
    const router = Router()

    router.post('/register', this.controller.register.bind(this.controller))
    router.post('/login', this.controller.login.bind(this.controller))

    router.patch(
      '/email',
      this.auth.authenticate.bind(this.auth),
      this.controller.changeEmail.bind(this.controller),
    )

    router.patch(
      '/password',
      this.auth.authenticate.bind(this.auth),
      this.controller.changePassword.bind(this.controller),
    )

    router.post(
      '/logout',
      this.auth.authenticate.bind(this.auth),
      this.controller.logoutCurrent.bind(this.controller),
    )

    router.post(
      '/logout-all',
      this.auth.authenticate.bind(this.auth),
      this.controller.logoutAll.bind(this.controller),
    )

    router.post('/refresh', this.controller.refresh.bind(this.controller))

    return router
  }
}

```

# File: src/presentation/http/validators/client/ChangeClientEmailValidator.ts

```typescript
import z from 'zod'

export const ChangeClientEmailSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(8),
})

```

# File: src/presentation/http/validators/client/ChangeClientPasswordValidator.ts

```typescript
import z from 'zod'

export const ChangeClientPasswordSchema = z.object({
  currentPassword: z.string().min(8).max(64),
  newPassword: z.string().min(8).max(64),
})

```

# File: src/presentation/http/validators/client/LoginClientValidator.ts

```typescript
import z from 'zod'

export const LoginClientSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  deviceName: z.string().optional(),
})

```

# File: src/presentation/http/validators/client/RefreshAccessTokenValidator.ts

```typescript
import { z } from 'zod'

export const RefreshTokenCookiesSchema = z.object({
  refresh_token: z.string().min(1),
})

export type RefreshTokenCookies = z.infer<typeof RefreshTokenCookiesSchema>

```

# File: src/presentation/http/validators/client/RegisterClientValidator.ts

```typescript
import { z } from 'zod'

export const RegisterClientSchema = z.object({
  name: z.string().min(8),
  email: z.email(),
  password: z.string().min(8),
  deviceName: z.string().optional(),
})

```

# File: src/shared/errors/AppError.ts

```typescript
export abstract class AppError extends Error {
  public readonly origin: string | undefined

  constructor(
    message: string,
    public readonly category: string,
    public readonly reason: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
    Error.captureStackTrace(this, new.target)
  }
}

```

# File: src/shared/errors/ConflictError.ts

```typescript
import { AppError } from './AppError'

export class ConflictError extends AppError {
  constructor(message: string, reason = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, 'CONFLICT', reason, details)
  }
}

```

# File: src/shared/errors/InternalServerError.ts

```typescript
import { AppError } from './AppError'

export class InternalServerError extends AppError {
  constructor(
    message: string,
    reason = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, 'INTERNAL_SERVER_ERROR', reason, details)
  }
}

```

# File: src/shared/errors/NotFoundError.ts

```typescript
import { AppError } from './AppError'

export class NotFoundError extends AppError {
  constructor(message: string, reason = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', reason, details)
  }
}

```

# File: src/shared/errors/UnauthorizedError.ts

```typescript
import { AppError } from './AppError'

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
    reason = 'UNAUTHORIZED',
    details?: Record<string, unknown>,
  ) {
    super(message, 'UNAUTHORIZED', reason, details)
  }
}

```

# File: src/shared/errors/ValidationError.ts

```typescript
import { AppError } from './AppError'

export class ValidationError extends AppError {
  constructor(message: string, reason = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', reason, details)
  }
}

```

# File: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@factories/*": ["./src/application/factories/*"],
      "@services/*": ["./src/application/services/*"],
      "@aggregates/*": ["./src/domain/aggregates/*"],
      "@entities/*": ["./src/domain/entities/*"],
      "@ports/*": ["./src/domain/ports/*"],
      "@app/*": ["./src/application/*"],
      "@valueObjects/*": ["./src/domain/valueObjects/*"],
      "@infra/*": ["./src/infrastructure/*"],
      "@libs/*": ["./src/libs/*"],
      "@config/*": ["./src/config/*"],
      "@generated/*": ["./src/generated/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "typeRoots": ["./src/@types", "./node_modules/@types"],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

```

# File: tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  shims: true,
  swc: {} as any,
})

```
