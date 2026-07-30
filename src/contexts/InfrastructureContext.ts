import { ClientRepository } from '@aggregates/client/ClientRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { UserRepository } from '@aggregates/user/UserRepository'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { BcryptPasswordHasher } from '@infra/crypto/BcryptIPasswordHasher'
import { CryptoHasher } from '@infra/crypto/CryptoHasher'
import { UuidIdGenerator } from '@infra/identity/UuidIdGenerator'
import { PrismaClientRepository } from '@infra/persistence/prisma/repositories/PrismaClientRepository'
import { PrismaProjectRepository } from '@infra/persistence/prisma/repositories/PrismaProjectRepository'
import { PrismaUserRepository } from '@infra/persistence/prisma/repositories/PrismaUserRepository'
import { PrismaSessionRepository } from '@infra/persistence/prisma/repositories/PrismaSessionRepository'
import { PrismaUserSessionRepository } from '@infra/persistence/prisma/repositories/PrismaUserSessionRepository'
import { PrismaRefreshTokenRepository } from '@infra/persistence/prisma/repositories/PrismaRefreshTokenRepository'
import { PrismaUserRefreshTokenRepository } from '@infra/persistence/prisma/repositories/PrismaUserRefreshTokenRepository'
import { PrismaUserFieldValueRepository } from '@infra/persistence/prisma/repositories/PrismaUserFieldValueRepository'
import { PrismaProjectFieldRepository } from '@infra/persistence/prisma/repositories/PrismaProjectFieldRepository'
import { Hasher } from '@ports/Hasher'
import { IdGenerator } from '@ports/IdGenerator'
import { PasswordHasher } from '@ports/PasswordHasher'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { UserAccessTokenService } from '@ports/UserAccessTokenService'
import { KeyGenerator } from '@ports/KeyGenerator'
import { Container, injectable } from 'inversify'
import { ServiceContext } from './ServiceContext'
import { ClientSessionFactory } from '@factories/ClientSessionFactory'
import { ClientRefreshTokenFactory } from '@factories/ClientRefreshTokenFactory'
import { UserSessionFactory } from '@factories/UserSessionFactory'
import { UserRefreshTokenFactory } from '@factories/UserRefreshTokenFactory'
import { ProjectFieldFactory } from '@factories/ProjectFieldFactory'
import { ApiKeyService } from '@app/services/ApiKeyService'
import { ClientAuthService } from '@services/auth/ClientAuthService'
import { UserAuthService } from '@services/auth/UserAuthService'
import { ClientRefreshTokenService } from '@services/refresh-token/ClientRefreshTokenService'
import { UserRefreshTokenService } from '@services/refresh-token/UserRefreshTokenService'
import { SchemaBuilderService } from '@services/schema/SchemaBuilderService'
import { ServerConfig } from '@config/server/server'
import { CryptoKeyGenerator } from '@infra/crypto/CryptoKeyGenerator'
import { ExpressApp } from '@infra/http/ExpressApp'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { HttpRouterRegistry } from '@infra/http/HttpRouterRegistry'
import { JwtClientAccessTokenService } from '@infra/jwt/JwtClientAccessTokenService'
import { JwtUserAccessTokenService } from '@infra/jwt/JwtUserAccessTokenService'
import { ClientRouter } from '@presentation/http/routes/client'
import { UserRouter } from '@presentation/http/routes/user'
import { ProjectRouter } from '@presentation/http/routes/project'
import { ErrorHandler } from '@presentation/http/middleware/errorHandler'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { ILogger } from '@ports/logger/ILogger'
import { PinoLogger } from '@infra/logger/PinoLogger'
import { UserFieldValueFactory } from '@factories/UserFieldValueFactory'

@injectable()
export class InfrastructureContext implements ServiceContext {
  register(container: Container): void {
    container.bind(ServerConfig).toSelf().inSingletonScope()

    container.bind(ExpressApp).toSelf().inSingletonScope()

    container.bind(HttpServerFactory).toSelf().inSingletonScope()

    container.bind(HttpRouterRegistry).toSelf().inSingletonScope()
    container.bind(ClientRouter).toSelf().inSingletonScope()
    container.bind(UserRouter).toSelf().inSingletonScope()
    container.bind(ProjectRouter).toSelf().inSingletonScope()
    container.bind(ErrorHandler).toSelf().inSingletonScope()

    container.bind(PrismaProvider).toSelf().inSingletonScope()

    // Client infrastructure
    container.bind(ClientRepository).to(PrismaClientRepository).inSingletonScope()
    container.bind(ClientSessionRepository).to(PrismaSessionRepository).inSingletonScope()
    container.bind(ClientRefreshTokenRepository).to(PrismaRefreshTokenRepository).inSingletonScope()
    container.bind(ClientAccessTokenService).to(JwtClientAccessTokenService).inSingletonScope()
    container.bind(ClientSessionFactory).toSelf().inSingletonScope()
    container.bind(ClientRefreshTokenFactory).toSelf().inSingletonScope()
    container.bind(ClientRefreshTokenService).toSelf().inSingletonScope()
    container.bind(ClientAuthService).toSelf().inSingletonScope()

    // User infrastructure
    container.bind(UserRepository).to(PrismaUserRepository).inSingletonScope()
    container.bind(UserSessionRepository).to(PrismaUserSessionRepository).inSingletonScope()
    container
      .bind(UserRefreshTokenRepository)
      .to(PrismaUserRefreshTokenRepository)
      .inSingletonScope()
    container.bind(UserFieldValueRepository).to(PrismaUserFieldValueRepository).inSingletonScope()
    container.bind(UserAccessTokenService).to(JwtUserAccessTokenService).inSingletonScope()
    container.bind(UserSessionFactory).toSelf().inSingletonScope()
    container.bind(UserRefreshTokenFactory).toSelf().inSingletonScope()
    container.bind(UserRefreshTokenService).toSelf().inSingletonScope()
    container.bind(UserAuthService).toSelf().inSingletonScope()
    container.bind(UserFieldValueFactory).toSelf().inSingletonScope()

    // Project infrastructure
    container.bind(ProjectRepository).to(PrismaProjectRepository).inSingletonScope()
    container.bind(ProjectFieldRepository).to(PrismaProjectFieldRepository).inSingletonScope()
    container.bind(ProjectFieldFactory).toSelf().inSingletonScope()

    // Shared
    container.bind(PasswordHasher).to(BcryptPasswordHasher).inSingletonScope()
    container.bind(Hasher).to(CryptoHasher).inSingletonScope()
    container.bind(KeyGenerator).to(CryptoKeyGenerator).inSingletonScope()
    container.bind(IdGenerator).to(UuidIdGenerator).inSingletonScope()
    container.bind(ApiKeyService).toSelf().inSingletonScope()
    container.bind(SchemaBuilderService).toSelf().inSingletonScope()
    container.bind(ILogger).to(PinoLogger).inSingletonScope()
  }
}
