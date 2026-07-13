```
.
├── .claude
│   └── CLAUDE.md
├── .env
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── docker-compose.yml
├── docs
│   └── superpowers
│       └── specs
│           └── 2026-06-30-ddd-cqrs-architecture.md
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── prisma
│   ├── migrations
│   │   ├── 20260628092028_init
│   │   │   └── migration.sql
│   │   ├── 20260628123715_project_owner_name_unique
│   │   │   └── migration.sql
│   │   ├── 20260628124323_limit_string_lengths
│   │   │   └── migration.sql
│   │   ├── 20260628132946_fix_varchar_lengths
│   │   │   └── migration.sql
│   │   ├── 20260629112649_add_refresh_token_model
│   │   │   └── migration.sql
│   │   ├── 20260629133650_refresh_token_hash_unique
│   │   │   └── migration.sql
│   │   ├── 20260629151117_multi_session_refresh_tokens
│   │   │   └── migration.sql
│   │   ├── 20260713101719_add_session_model
│   │   │   └── migration.sql
│   │   ├── 20260713101810_session_add_index_on_client_id
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── prisma.config.ts
├── README.md
├── src
│   ├── application
│   │   ├── commands
│   │   │   ├── client
│   │   │   │   ├── ChangeClientEmail
│   │   │   │   │   ├── ChangeClientEmailCommand.ts
│   │   │   │   │   └── ChangeClientEmailHandler.ts
│   │   │   │   ├── ChangeClientPassword
│   │   │   │   │   ├── ChangeClientPasswordCommand.ts
│   │   │   │   │   └── ChangeClientPasswordHandler.ts
│   │   │   │   ├── LoginClient
│   │   │   │   │   ├── LoginClientCommand.ts
│   │   │   │   │   └── LoginClientHandler.ts
│   │   │   │   ├── LogoutAllSessions
│   │   │   │   │   ├── LogoutAllSessionsCommand.ts
│   │   │   │   │   └── LogoutAllSessionsHandler.ts
│   │   │   │   ├── LogoutCurrentSession
│   │   │   │   │   ├── LogoutCurrentSessionCommand.ts
│   │   │   │   │   └── LogoutCurrentSessionHandler.ts
│   │   │   │   ├── RefreshAccessToken
│   │   │   │   │   ├── RefreshAccessTokenCommand.ts
│   │   │   │   │   └── RefreshAccessTokenHandler.ts
│   │   │   │   └── RegisterClient
│   │   │   │       ├── RegisterClientCommand.ts
│   │   │   │       └── RegisterClientHandler.ts
│   │   │   └── project
│   │   │       ├── CreateNewApiKey
│   │   │       │   ├── CreateNewApiKeyCommand.ts
│   │   │       │   └── CreateNewApiKeyHandler.ts
│   │   │       └── CreateProject
│   │   │           ├── CreateProjectCommand.ts
│   │   │           └── CreateProjectHandler.ts
│   │   └── services
│   │       ├── ApiKeyService.ts
│   │       └── SessionService.ts
│   ├── application.ts
│   ├── bootstrap.ts
│   ├── config
│   │   └── server.ts
│   ├── contexts
│   │   ├── ApplicationContext.ts
│   │   ├── InfrastructureContex.ts
│   │   ├── ServiceContext.ts
│   │   └── ServiceContextBuilder.ts
│   ├── domain
│   │   ├── aggregates
│   │   │   ├── client
│   │   │   │   ├── Client.ts
│   │   │   │   ├── ClientRepository.ts
│   │   │   │   ├── Email.ts
│   │   │   │   └── Password.ts
│   │   │   ├── project
│   │   │   │   ├── ApiKey.ts
│   │   │   │   ├── Project.ts
│   │   │   │   └── ProjectRepository.ts
│   │   │   └── session
│   │   │       ├── Session.ts
│   │   │       └── SessionRepository.ts
│   │   ├── ports
│   │   │   ├── AccessTokenService.ts
│   │   │   ├── Hasher.ts
│   │   │   ├── IdGenerator.ts
│   │   │   ├── KeyGenerator.ts
│   │   │   └── PasswordHasher.ts
│   │   └── valueObjects
│   │       └── Name.ts
│   ├── infrastructure
│   │   ├── crypto
│   │   │   ├── BcryptIPasswordHasher.ts
│   │   │   ├── CryptoHasher.ts
│   │   │   └── CryptoKeyGenerator.ts
│   │   ├── http
│   │   │   ├── ExpressApp.ts
│   │   │   └── HttpServerFactory.ts
│   │   ├── identity
│   │   │   └── UuidIdGenerator.ts
│   │   ├── jwt
│   │   │   └── JwtAccessTokenService.ts
│   │   └── persistence
│   │       ├── client
│   │       │   ├── ClientMapper.ts
│   │       │   └── PrismaClientRepository.ts
│   │       ├── project
│   │       │   ├── PrismaProjectRepository.ts
│   │       │   └── ProjectMapper.ts
│   │       └── session
│   │           ├── PrismaSessionRepository.ts
│   │           └── SessionMapper.ts
│   ├── libs
│   │   └── ddd
│   │       ├── AggregateRoot.ts
│   │       ├── Identifiable.ts
│   │       ├── ValueObject.ts
│   │       └── VO
│   │           └── NameVO.ts
│   ├── main.ts
│   ├── presentation
│   │   └── http
│   │       └── controllers
│   │           └── ClientControllet.ts
│   └── shared
│       └── errors
│           ├── AppError.ts
│           ├── ConflictError.ts
│           ├── InternalServerError.ts
│           ├── NotFoundError.ts
│           ├── UnauthorizedError.ts
│           └── ValidationError.ts
└── tsconfig.json
```
