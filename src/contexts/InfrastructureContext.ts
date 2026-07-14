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
import { SessionService } from '@app/services/SessionService'
import { ApiKeyService } from '@app/services/ApiKeyService'
import { ServerConfig } from '@config/server'
import { CryptoKeyGenerator } from '@infra/crypto/CryptoKeyGenerator'
import { ExpressApp } from '@infra/http/ExpressApp'
import { HttpServerFactory } from '@infra/http/HttpServerFactory'
import { JwtAccessTokenService } from '@infra/jwt/JwtAccessTokenService'
import { AccessTokenService } from '@ports/AccessTokenService'
import { KeyGenerator } from '@ports/KeyGenerator'
import { PrismaClient } from '@prisma/client'
import { SessionRepository } from '@aggregates/session/SessionRepository'
import { PrismaSessionRepository } from '@infra/persistence/session/PrismaSessionRepository'

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

    container.bind(SessionService).toSelf().inSingletonScope()
  }
}
