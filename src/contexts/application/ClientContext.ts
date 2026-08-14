import { Container, injectable } from 'inversify'
import { ServiceContext } from '../ServiceContext'

import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { RefreshClientAccessTokenHandler } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RenameClientHandler } from '@app/commands/client/RenameClient/RenameClientHandler'
import { GetClientProfileHandler } from '@app/queries/client/GetClientProfile/GetClientProfileHandler'
import { GetClientProjectsHandler } from '@app/queries/client/GetClientProjects/GetClientProjectsHandler'
import { GetClientSessionsHandler } from '@app/queries/client/GetClientSessions/GetClientSessionsHandler'
import { RevokeClientSessionHandler } from '@app/commands/client/RevokeClientSession/RevokeClientSessionHandler'

import { ClientAuthService } from '@services/auth/ClientAuthService'
import { ClientRefreshTokenService } from '@services/refresh-token/ClientRefreshTokenService'
import { ClientSessionFactory } from '@factories/ClientSessionFactory'
import { ClientRefreshTokenFactory } from '@factories/ClientRefreshTokenFactory'

import { ClientController } from '@presentation/http/controllers/ClientController'
import { ClientAuthMiddleware } from '@presentation/http/middleware/ClientAuthMiddleware'

@injectable()
export class ClientContext implements ServiceContext {
  register(container: Container): void {
    container.bind(RegisterClientHandler).toSelf()
    container.bind(LoginClientHandler).toSelf()
    container.bind(ChangeClientEmailHandler).toSelf()
    container.bind(ChangeClientPasswordHandler).toSelf()
    container.bind(LogoutCurrentClientSessionHandler).toSelf()
    container.bind(LogoutAllClientSessionsHandler).toSelf()
    container.bind(RefreshClientAccessTokenHandler).toSelf()
    container.bind(RenameClientHandler).toSelf()
    container.bind(GetClientProfileHandler).toSelf()
    container.bind(GetClientProjectsHandler).toSelf()
    container.bind(GetClientSessionsHandler).toSelf()
    container.bind(RevokeClientSessionHandler).toSelf()

    container.bind(ClientAuthService).toSelf().inSingletonScope()
    container.bind(ClientRefreshTokenService).toSelf().inSingletonScope()
    container.bind(ClientSessionFactory).toSelf().inSingletonScope()
    container.bind(ClientRefreshTokenFactory).toSelf().inSingletonScope()

    container.bind(ClientController).toSelf()
    container.bind(ClientAuthMiddleware).toSelf()
  }
}
