import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { RefreshClientAccessTokenHandler } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RenameClientHandler } from '@app/commands/client/RenameClient/RenameClientHandler'
import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { LoginUserHandler } from '@app/commands/user/LoginUser/LoginUserHandler'
import { LogoutAllUserSessionsHandler } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler'
import { LogoutUserSessionHandler } from '@app/commands/user/LogoutUserSession/LogoutUserSessionHandler'
import { RefreshUserAccessTokenHandler } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { UpdateUserFieldHandler } from '@app/commands/user/UpdateUserField/UpdateUserFieldHandler'
import { ChangeUserEmailHandler } from '@app/commands/user/ChangeUserEmail/ChangeUserEmailHandler'
import { ChangeUserPasswordHandler } from '@app/commands/user/ChangeUserPassword/ChangeUserPasswordHandler'
import { DeleteUserSelfHandler } from '@app/commands/user/DeleteUserSelf/DeleteUserSelfHandler'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { AddProjectFieldHandler } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import { UpdateProjectFieldHandler } from '@app/commands/project/UpdateProjectField/UpdateProjectFieldHandler'
import { DeleteProjectFieldHandler } from '@app/commands/project/DeleteProjectField/DeleteProjectFieldHandler'
import { RenameProjectHandler } from '@app/commands/project/RenameProject/RenameProjectHandler'
import { DeleteProjectHandler } from '@app/commands/project/DeleteProject/DeleteProjectHandler'
import { RotateApiKeyHandler } from '@app/commands/project/RotateApiKey/RotateApiKeyHandler'
import { RenameApiKeyHandler } from '@app/commands/project/RenameApiKey/RenameApiKeyHandler'
import { DeleteProjectUserHandler } from '@app/commands/project/DeleteProjectUser/DeleteProjectUserHandler'
import { UpdateProjectUserFieldHandler } from '@app/commands/project/UpdateProjectUserField/UpdateProjectUserFieldHandler'
import { GetClientProjectsHandler } from '@app/queries/client/GetClientProjects/GetClientProjectsHandler'
import { GetClientProfileHandler } from '@app/queries/client/GetClientProfile/GetClientProfileHandler'
import { GetUserProfileHandler } from '@app/queries/user/GetUserProfile/GetUserProfileHandler'
import { GetUserFieldsHandler } from '@app/queries/user/GetUserFields/GetUserFieldsHandler'
import { GetUserFieldHandler } from '@app/queries/user/GetUserField/GetUserFieldHandler'
import { GetProjectFieldsHandler } from '@app/queries/project/GetProjectFields/GetProjectFieldsHandler'
import { GetProjectHandler } from '@app/queries/project/GetProject/GetProjectHandler'
import { GetProjectApiKeyHandler } from '@app/queries/project/GetProjectApiKey/GetProjectApiKeyHandler'
import { GetProjectUsersHandler } from '@app/queries/project/GetProjectUsers/GetProjectUsersHandler'
import { GetProjectUserHandler } from '@app/queries/project/GetProjectUser/GetProjectUserHandler'
import { GetProjectUserFieldsHandler } from '@app/queries/project/GetProjectUserFields/GetProjectUserFieldsHandler'
import { UserController } from '@presentation/http/controllers/UserController'
import { ClientAuthMiddleware } from '@presentation/http/middleware/ClientAuthMiddleware'
import { UserAuthMiddleware } from '@presentation/http/middleware/UserAuthMiddleware'
import { Container, injectable } from 'inversify'
import { ServiceContext } from './ServiceContext'
import { ClientController } from '@presentation/http/controllers/ClientController'
import { ProjectController } from '@presentation/http/controllers/ProjectController'

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
    container.bind(RenameClientHandler).toSelf()
    container.bind(GetClientProfileHandler).toSelf()
    container.bind(GetClientProjectsHandler).toSelf()

    // User commands
    container.bind(RegisterUserHandler).toSelf()
    container.bind(LoginUserHandler).toSelf()
    container.bind(LogoutAllUserSessionsHandler).toSelf()
    container.bind(LogoutUserSessionHandler).toSelf()
    container.bind(RefreshUserAccessTokenHandler).toSelf()
    container.bind(UpdateUserFieldHandler).toSelf()
    container.bind(ChangeUserEmailHandler).toSelf()
    container.bind(ChangeUserPasswordHandler).toSelf()
    container.bind(DeleteUserSelfHandler).toSelf()
    container.bind(GetUserProfileHandler).toSelf()
    container.bind(GetUserFieldsHandler).toSelf()
    container.bind(GetUserFieldHandler).toSelf()

    // Project commands
    container.bind(CreateProjectHandler).toSelf()
    container.bind(AddProjectFieldHandler).toSelf()
    container.bind(UpdateProjectFieldHandler).toSelf()
    container.bind(DeleteProjectFieldHandler).toSelf()
    container.bind(RenameProjectHandler).toSelf()
    container.bind(DeleteProjectHandler).toSelf()
    container.bind(RotateApiKeyHandler).toSelf()
    container.bind(RenameApiKeyHandler).toSelf()
    container.bind(DeleteProjectUserHandler).toSelf()
    container.bind(UpdateProjectUserFieldHandler).toSelf()
    container.bind(GetProjectFieldsHandler).toSelf()
    container.bind(GetProjectHandler).toSelf()
    container.bind(GetProjectApiKeyHandler).toSelf()
    container.bind(GetProjectUsersHandler).toSelf()
    container.bind(GetProjectUserHandler).toSelf()
    container.bind(GetProjectUserFieldsHandler).toSelf()

    // Presentation
    container.bind(ClientController).toSelf()
    container.bind(UserController).toSelf()
    container.bind(ProjectController).toSelf()
    container.bind(ClientAuthMiddleware).toSelf()
    container.bind(UserAuthMiddleware).toSelf()
  }
}
