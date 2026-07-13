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
