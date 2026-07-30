import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { RefreshClientAccessTokenHandler } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { LoginUserHandler } from '@app/commands/user/LoginUser/LoginUserHandler'
import { LogoutAllUserSessionsHandler } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler'
import { LogoutUserSessionHandler } from '@app/commands/user/LogoutUserSession/LogoutUserSessionHandler'
import { RefreshUserAccessTokenHandler } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { AddProjectFieldHandler } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import { UpdateProjectFieldHandler } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldHandler'
import { DeleteProjectFieldHandler } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldHandler'
import { GetProjectFieldsHandler } from '@app/queries/project/GetProjectFields/GetProjectFieldsHandler'
import { UserController } from '@presentation/http/controllers/UserController'
import { ClientAuthMiddleware } from '@presentation/http/middleware/ClientAuthMiddleware'
import { UserAuthMiddleware } from '@presentation/http/middleware/UserAuthMiddleware'
import { Container, injectable } from 'inversify'
import { ServiceContext } from './ServiceContext'
import { ClientController } from '@presentation/http/controllers/ClientController'
import { ProjectController } from '@presentation/http/controllers/ProjectController'
import { UpdateUserFieldHandler } from '@app/commands/user/UpdateUserField/UpdateUserFieldHandler'

@injectable()
export class ApplicationContext implements ServiceContext {
  register(container: Container): void {
    // Client commands
    container.bind(RegisterClientHandler).toSelf()
    container.bind(LoginClientHandler).toSelf()
    container.bind(ChangeClientPasswordHandler).toSelf()
    container.bind(ChangeClientEmailHandler).toSelf()
    container.bind(LogoutAllClientSessionsHandler).toSelf()
    container.bind(LogoutCurrentClientSessionHandler).toSelf()
    container.bind(RefreshClientAccessTokenHandler).toSelf()

    // User commands
    container.bind(RegisterUserHandler).toSelf()
    container.bind(LoginUserHandler).toSelf()
    container.bind(LogoutAllUserSessionsHandler).toSelf()
    container.bind(LogoutUserSessionHandler).toSelf()
    container.bind(RefreshUserAccessTokenHandler).toSelf()
    container.bind(UpdateUserFieldHandler).toSelf()

    // Project commands
    container.bind(CreateProjectHandler).toSelf()
    container.bind(AddProjectFieldHandler).toSelf()
    container.bind(UpdateProjectFieldHandler).toSelf()
    container.bind(DeleteProjectFieldHandler).toSelf()
    container.bind(GetProjectFieldsHandler).toSelf()

    // Presentation
    container.bind(ClientController).toSelf()
    container.bind(UserController).toSelf()
    container.bind(ProjectController).toSelf()
    container.bind(ClientAuthMiddleware).toSelf()
    container.bind(UserAuthMiddleware).toSelf()
  }
}
