# auth-service

Multi-tenant authentication service built with DDD + CQRS. Developers (clients) register, create projects, and authenticate their own users through a project-scoped API key. Each project is an isolated auth namespace with its own users, sessions, and custom user fields.

> Pet project by [zborodayev1](https://github.com/zborodayev1) — built to learn DDD/CQRS hands-on.

---

## How It Works

```
Client (developer)
  └── creates Projects
        └── Project has an ApiKey
              └── SDK sends ApiKey on every request
                    └── Users register/login/manage profile within the Project
```

- **Client** — developer account. Manages projects via JWT.
- **Project** — isolated auth namespace. Has one ApiKey and a schema of custom user fields.
- **User** — end-user within a project. Authenticated via the project's ApiKey + userJWT.
- **Custom fields** — per-project typed fields (string, number, boolean, date, enum) attached to each user.

---

## Tech Stack

| Layer         | Technology                             |
| ------------- | -------------------------------------- |
| Runtime       | Node.js                                |
| Language      | TypeScript 6 (strict, ESM)             |
| Framework     | Express 5                              |
| ORM           | Prisma 7 (pg adapter)                  |
| Database      | PostgreSQL 17                          |
| Cache         | Redis (ioredis) — project schema cache |
| DI Container  | InversifyJS                            |
| Auth          | JWT (jsonwebtoken) + bcrypt            |
| Validation    | Zod                                    |
| Logging       | Pino                                   |
| Security      | Helmet, express-rate-limit, CORS       |
| Build         | tsup + SWC                             |
| Tests         | Vitest (unit + integration)            |

---

## Architecture

DDD + CQRS with strict layer separation.

```
src/
  domain/           — aggregates, value objects, repository interfaces (ports)
  application/      — CQRS command handlers, query handlers, app services, factories
  infrastructure/   — Prisma repos + mappers, JWT, bcrypt, Redis, Pino, UUID
  presentation/     — HTTP controllers, routes, middleware, Zod validators
  contexts/         — InversifyJS DI container wiring
  libs/ddd/         — base classes: AggregateRoot, Entity, ValueObject, Identifiable
  shared/           — error types (AppError, ConflictError, NotFoundError, …)
  config/           — server config
```

### Domain Aggregates

| Aggregate          | Description                                    |
| ------------------ | ---------------------------------------------- |
| `Client`           | Developer account (email, password, projects)  |
| `ClientSession`    | Client auth session with refresh token chain   |
| `RefreshToken`     | Client refresh token (rotation + revocation)   |
| `Project`          | Auth namespace (apiKey, jwtSecret, fields)     |
| `ProjectField`     | Typed custom field definition within a project |
| `User`             | End-user within a project                      |
| `UserSession`      | User auth session with refresh token chain     |
| `UserRefreshToken` | User refresh token (rotation + revocation)     |
| `UserFieldValue`   | User's value for a project field               |

### CQRS Commands

**Client:** `RegisterClient`, `LoginClient`, `RenameClient`, `ChangeClientEmail`, `ChangeClientPassword`, `LogoutCurrentClientSession`, `LogoutAllClientSessions`, `RefreshClientAccessToken`, `RevokeClientSession`

**Project:** `CreateProject`, `DeleteProject`, `RenameProject`, `AddProjectField`, `UpdateProjectField`, `DeleteProjectField`, `RecoverProjectField`, `RotateApiKey`, `RenameApiKey`, `UpdateProjectUserField`, `DeleteProjectUser`

**User:** `RegisterUser`, `LoginUser`, `LogoutUserSession`, `LogoutAllUserSessions`, `RefreshUserAccessToken`, `ChangeUserEmail`, `ChangeUserPassword`, `DeleteUserSelf`, `UpdateUserField`, `RevokeUserSession`

---

## HTTP API

### Client routes (`/client`)

| Method | Path                     | Auth      |
| ------ | ------------------------ | --------- |
| POST   | `/client/register`       | —         |
| POST   | `/client/login`          | —         |
| POST   | `/client/refresh`        | —         |
| GET    | `/client/me`             | clientJWT |
| GET    | `/client/me/projects`    | clientJWT |
| GET    | `/client/me/sessions`    | clientJWT |
| PATCH  | `/client/me/name`        | clientJWT |
| PATCH  | `/client/me/email`       | clientJWT |
| PATCH  | `/client/me/password`    | clientJWT |
| POST   | `/client/logout`         | clientJWT |
| POST   | `/client/logout-all`     | clientJWT |
| DELETE | `/client/sessions/:id`   | clientJWT |

### Project routes (`/projects`)

| Method | Path                              | Auth      |
| ------ | --------------------------------- | --------- |
| POST   | `/projects`                       | clientJWT |
| GET    | `/projects/:projectId`            | clientJWT |
| PATCH  | `/projects/:projectId/name`       | clientJWT |
| DELETE | `/projects/:projectId`            | clientJWT |
| GET    | `/projects/:projectId/api-key`    | clientJWT |
| POST   | `/projects/:projectId/api-key`    | clientJWT |
| PATCH  | `/projects/:projectId/api-key`    | clientJWT |
| GET    | `/projects/:projectId/fields`     | clientJWT |
| POST   | `/projects/:projectId/fields`     | clientJWT |
| PATCH  | `/projects/:projectId/fields/:id` | clientJWT |
| DELETE | `/projects/:projectId/fields/:id` | clientJWT |
| POST   | `/projects/:projectId/fields/:id/recover` | clientJWT |
| GET    | `/projects/:projectId/users`      | clientJWT |
| GET    | `/projects/:projectId/users/:id`  | clientJWT |
| DELETE | `/projects/:projectId/users/:id`  | clientJWT |

### User routes (`/projects/:projectId/users`)

All user endpoints require `Authorization: Bearer <apiKey>`. Endpoints marked `+userJWT` additionally require a user access token.

| Method | Path                               | Auth             |
| ------ | ---------------------------------- | ---------------- |
| POST   | `/register`                        | apiKey           |
| POST   | `/login`                           | apiKey           |
| POST   | `/refresh`                         | apiKey           |
| POST   | `/logout`                          | apiKey + userJWT |
| POST   | `/logout-all`                      | apiKey + userJWT |
| GET    | `/me`                              | apiKey + userJWT |
| PATCH  | `/me/email`                        | apiKey + userJWT |
| PATCH  | `/me/password`                     | apiKey + userJWT |
| DELETE | `/me`                              | apiKey + userJWT |
| GET    | `/me/fields`                       | apiKey + userJWT |
| GET    | `/me/fields/:fieldId`              | apiKey + userJWT |
| PATCH  | `/me/fields/:fieldId`              | apiKey + userJWT |

Refresh tokens are delivered via httpOnly cookie.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL + Redis)

### Install

```bash
git clone https://github.com/zborodayev1/borodayev-auth-systems.git
cd borodayev-auth-systems
pnpm install
```

### Environment

Copy `.env.example` to `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/authdb
REDIS_URL=redis://localhost:6379
HTTP_PORT=8080
JWT_SECRET=your-secret-at-least-32-chars
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=12
REFRESH_TOKEN_TTL_MS=2592000000
```

### Database

```bash
docker-compose up -d                        # start PostgreSQL + Redis
npx prisma migrate dev --name init          # run migrations
npx prisma generate                         # generate client (already in src/generated/prisma/)
```

### Run

```bash
pnpm dev        # watch mode — tsup + hot reload
pnpm build      # compile to dist/
pnpm start      # run dist/main.js
```

---

## Development

```bash
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint src
pnpm lint:fix           # eslint src --fix
pnpm format             # prettier --write src

pnpm test               # unit tests
pnpm test:integration   # integration tests (requires DB)
pnpm test:coverage      # coverage report
```

---

## License

[MIT](LICENSE)
