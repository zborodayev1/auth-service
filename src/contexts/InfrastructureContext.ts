import { ClientRepository } from '@aggregates/client/ClientRepository'
import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { BcryptPasswordHasher } from '@infra/crypto/BcryptIPasswordHasher'
import { CryptoHasher } from '@infra/crypto/CryptoHasher'
import { UuidIdGenerator } from '@infra/identity/UuidIdGenerator'
import { PrismaClientRepository } from '@infra/persistence/prisma/repositories/PrismaClientRepository'
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
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { RefreshTokenFactory } from '@factories/RefreshTokenFactory'
import { RefreshTokenRepository } from '@aggregates/refreshToken/RefreshTokenRepository'
import { AuthService } from '@services/auth/AuthService'
import { RefreshTokenService } from '@services/refresh-token/RefreshTokenService'
import { PrismaSessionRepository } from '@infra/persistence/prisma/repositories/PrismaSessionRepository'
import { PrismaProjectRepository } from '@infra/persistence/prisma/repositories/PrismaProjectRepository'
import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { PrismaRefreshTokenRepository } from '@infra/persistence/prisma/repositories/PrismaRefreshTokenRepository'
import { ILogger } from '@ports/logger/ILogger'
import { PinoLogger } from '@infra/logger/PinoLogger'

@injectable()
export class InfrastructureContext implements ServiceContext {
  register(container: Container): void {
    container.bind(ServerConfig).toSelf().inSingletonScope()

    container.bind(ExpressApp).toSelf().inSingletonScope()

    container.bind(HttpServerFactory).toSelf().inSingletonScope()

    container.bind(PrismaProvider).toSelf().inSingletonScope()

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

    container.bind(RefreshTokenRepository).to(PrismaRefreshTokenRepository).inSingletonScope()
    container.bind(RefreshTokenService).toSelf().inSingletonScope()
    container.bind(AuthService).toSelf().inSingletonScope()

    container.bind(ILogger).to(PinoLogger).inSingletonScope()
  }
}
