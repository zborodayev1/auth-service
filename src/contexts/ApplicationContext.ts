import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { Container, injectable } from 'inversify'
import { ServiceContext } from './ServiceContext'
import { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { RefreshClientAccessTokenHandler } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'

@injectable()
export class ApplicationContext implements ServiceContext {
  register(container: Container): void {
    container.bind(RegisterClientHandler).toSelf()

    container.bind(LoginClientHandler).toSelf()

    container.bind(ChangeClientPasswordHandler).toSelf()

    container.bind(ChangeClientEmailHandler).toSelf()

    container.bind(LogoutAllClientSessionsHandler).toSelf()

    container.bind(LogoutCurrentClientSessionHandler).toSelf()

    container.bind(RefreshClientAccessTokenHandler).toSelf()

    container.bind(CreateProjectHandler).toSelf()
  }
}
