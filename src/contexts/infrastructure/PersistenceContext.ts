import { Container, injectable } from 'inversify'
import { ServiceContext } from '../ServiceContext'

import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { TransactionContext } from '@infra/persistence/prisma/TransactionContext'
import { PrismaUnitOfWork } from '@infra/persistence/prisma/PrismaUnitOfWork'
import { UnitOfWork } from '@ports/UnitOfWork'

import { ClientRepository } from '@aggregates/client/ClientRepository'
import { ClientSessionRepository } from '@aggregates/clientSession/ClientSessionRepository'
import { ClientRefreshTokenRepository } from '@aggregates/clientRefreshToken/ClientRefreshTokenRepository'
import { PrismaClientRepository } from '@infra/persistence/prisma/repositories/PrismaClientRepository'
import { PrismaClientSessionRepository } from '@infra/persistence/prisma/repositories/PrismaClientSessionRepository'
import { PrismaRefreshTokenRepository } from '@infra/persistence/prisma/repositories/PrismaRefreshTokenRepository'

import { UserRepository } from '@aggregates/user/UserRepository'
import { UserSessionRepository } from '@aggregates/userSession/UserSessionRepository'
import { UserRefreshTokenRepository } from '@aggregates/userRefreshToken/UserRefreshTokenRepository'
import { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { PrismaUserRepository } from '@infra/persistence/prisma/repositories/PrismaUserRepository'
import { PrismaUserSessionRepository } from '@infra/persistence/prisma/repositories/PrismaUserSessionRepository'
import { PrismaUserRefreshTokenRepository } from '@infra/persistence/prisma/repositories/PrismaUserRefreshTokenRepository'
import { PrismaUserFieldValueRepository } from '@infra/persistence/prisma/repositories/PrismaUserFieldValueRepository'

import { ProjectRepository } from '@aggregates/project/ProjectRepository'
import { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import { PrismaProjectRepository } from '@infra/persistence/prisma/repositories/PrismaProjectRepository'
import { PrismaProjectFieldRepository } from '@infra/persistence/prisma/repositories/PrismaProjectFieldRepository'
import { IJob } from '@ports/IJob'
import { JobManager } from '@infra/jobs/JobManager'
import { SoftDeletePurgeJob } from '@infra/jobs/SoftDeletePurgeJob'

@injectable()
export class PersistenceContext implements ServiceContext {
  register(container: Container): void {
    container.bind(PrismaProvider).toSelf().inSingletonScope()
    container.bind(TransactionContext).toSelf().inSingletonScope()
    container.bind(UnitOfWork).to(PrismaUnitOfWork).inSingletonScope()

    container.bind(ClientRepository).to(PrismaClientRepository).inSingletonScope()
    container.bind(ClientSessionRepository).to(PrismaClientSessionRepository).inSingletonScope()
    container.bind(ClientRefreshTokenRepository).to(PrismaRefreshTokenRepository).inSingletonScope()

    container.bind(UserRepository).to(PrismaUserRepository).inSingletonScope()
    container.bind(UserSessionRepository).to(PrismaUserSessionRepository).inSingletonScope()
    container
      .bind(UserRefreshTokenRepository)
      .to(PrismaUserRefreshTokenRepository)
      .inSingletonScope()
    container.bind(UserFieldValueRepository).to(PrismaUserFieldValueRepository).inSingletonScope()

    container.bind(ProjectRepository).to(PrismaProjectRepository).inSingletonScope()
    container.bind(ProjectFieldRepository).to(PrismaProjectFieldRepository).inSingletonScope()

    container.bind(IJob).to(SoftDeletePurgeJob).inSingletonScope()
    container.bind(JobManager).toSelf().inSingletonScope()
  }
}
