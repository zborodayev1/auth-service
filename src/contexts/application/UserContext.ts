import { Container, injectable } from 'inversify'
import { ServiceContext } from '../ServiceContext'

import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { LoginUserHandler } from '@app/commands/user/LoginUser/LoginUserHandler'
import { LogoutUserSessionHandler } from '@app/commands/user/LogoutUserSession/LogoutUserSessionHandler'
import { LogoutAllUserSessionsHandler } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler'
import { RefreshUserAccessTokenHandler } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { UpdateUserFieldHandler } from '@app/commands/user/UpdateUserField/UpdateUserFieldHandler'
import { ChangeUserEmailHandler } from '@app/commands/user/ChangeUserEmail/ChangeUserEmailHandler'
import { ChangeUserPasswordHandler } from '@app/commands/user/ChangeUserPassword/ChangeUserPasswordHandler'
import { DeleteUserSelfHandler } from '@app/commands/user/DeleteUserSelf/DeleteUserSelfHandler'
import { GetUserProfileHandler } from '@app/queries/user/GetUserProfile/GetUserProfileHandler'
import { GetUserFieldsHandler } from '@app/queries/user/GetUserFields/GetUserFieldsHandler'
import { GetUserFieldHandler } from '@app/queries/user/GetUserField/GetUserFieldHandler'

import { UserAuthService } from '@services/auth/UserAuthService'
import { UserRefreshTokenService } from '@services/refresh-token/UserRefreshTokenService'
import { UserSessionFactory } from '@factories/UserSessionFactory'
import { UserRefreshTokenFactory } from '@factories/UserRefreshTokenFactory'
import { UserFieldValueFactory } from '@factories/UserFieldValueFactory'

import { UserController } from '@presentation/http/controllers/UserController'
import { UserAuthMiddleware } from '@presentation/http/middleware/UserAuthMiddleware'
import { ApiKeyAuthMiddleware } from '@presentation/http/middleware/ApiKeyAuthMiddleware'

@injectable()
export class UserContext implements ServiceContext {
  register(container: Container): void {
    container.bind(RegisterUserHandler).toSelf()
    container.bind(LoginUserHandler).toSelf()
    container.bind(LogoutUserSessionHandler).toSelf()
    container.bind(LogoutAllUserSessionsHandler).toSelf()
    container.bind(RefreshUserAccessTokenHandler).toSelf()
    container.bind(UpdateUserFieldHandler).toSelf()
    container.bind(ChangeUserEmailHandler).toSelf()
    container.bind(ChangeUserPasswordHandler).toSelf()
    container.bind(DeleteUserSelfHandler).toSelf()
    container.bind(GetUserProfileHandler).toSelf()
    container.bind(GetUserFieldsHandler).toSelf()
    container.bind(GetUserFieldHandler).toSelf()

    container.bind(UserAuthService).toSelf().inSingletonScope()
    container.bind(UserRefreshTokenService).toSelf().inSingletonScope()
    container.bind(UserSessionFactory).toSelf().inSingletonScope()
    container.bind(UserRefreshTokenFactory).toSelf().inSingletonScope()
    container.bind(UserFieldValueFactory).toSelf().inSingletonScope()

    container.bind(UserController).toSelf()
    container.bind(UserAuthMiddleware).toSelf()
    container.bind(ApiKeyAuthMiddleware).toSelf()
  }
}
