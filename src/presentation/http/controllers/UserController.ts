import { LoginUserHandler } from '@app/commands/user/LoginUser/LoginUserHandler'
import { LogoutAllUserSessionsHandler } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler'
import { LogoutUserSessionHandler } from '@app/commands/user/LogoutUserSession/LogoutUserSessionHandler'
import { RefreshUserAccessTokenHandler } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { ServerConfig } from '@config/server/server'
import { injectable, inject } from 'inversify'
import type { Request, Response } from 'express'
import { RegisterUserSchema } from '../validators/user/RegisterUserValidator'
import { RegisterUserCommand } from '@app/commands/user/RegisterUser/RegisterUserCommand'
import { ProjectIdParamSchema } from '../validators/project/ProjectIdParamValidator'
import { LoginUserSchema } from '../validators/user/LoginUserValidator'
import { LoginUserCommand } from '@app/commands/user/LoginUser/LoginUserCommand'
import { RefreshTokenCookiesSchema } from '../validators/refreshToken/RefreshTokenCookies'
import { RefreshUserAccessTokenCommand } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { LogoutAllUserSessionsCommand } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsCommand'
import { LogoutUserSessionCommand } from '@app/commands/user/LogoutUserSession/LogoutUserSessionCommand'
import {
  UpdateUserFieldBodySchema,
  UpdateUserFieldParamSchema,
} from '../validators/user/UpdateUserFieldValidator'
import { UpdateUserFieldHandler } from '@app/commands/user/UpdateUserField/UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from '@app/commands/user/UpdateUserField/UpdateUserFieldCommand'
import { GetUserProfileHandler } from '@app/queries/user/GetUserProfile/GetUserProfileHandler'
import { GetUserProfileQuery } from '@app/queries/user/GetUserProfile/GetUserProfileQuery'
import { ChangeUserEmailHandler } from '@app/commands/user/ChangeUserEmail/ChangeUserEmailHandler'
import { ChangeUserEmailSchema } from '../validators/user/ChangeUserEmailValidator'
import { ChangeUserEmailCommand } from '@app/commands/user/ChangeUserEmail/ChangeUserEmailCommand'
import { ChangeUserPasswordHandler } from '@app/commands/user/ChangeUserPassword/ChangeUserPasswordHandler'
import { ChangeUserPasswordSchema } from '../validators/user/ChangeUserPasswordValidator'
import { ChangeUserPasswordCommand } from '@app/commands/user/ChangeUserPassword/ChangeUserPasswordCommand'
import { DeleteUserSelfHandler } from '@app/commands/user/DeleteUserSelf/DeleteUserSelfHandler'
import { DeleteUserSelfSchema } from '../validators/user/DeleteUserSelfValidator'
import { DeleteUserSelfCommand } from '@app/commands/user/DeleteUserSelf/DeleteUserSelfCommand'
import { GetUserFieldsHandler } from '@app/queries/user/GetUserFields/GetUserFieldsHandler'
import { GetUserFieldsQuery } from '@app/queries/user/GetUserFields/GetUserFieldsQuery'
import { GetUserFieldHandler } from '@app/queries/user/GetUserField/GetUserFieldHandler'
import { GetUserFieldQuery } from '@app/queries/user/GetUserField/GetUserFieldQuery'

@injectable()
export class UserController {
  constructor(
    private readonly registerHandler: RegisterUserHandler,
    private readonly loginHandler: LoginUserHandler,
    private readonly refreshHandler: RefreshUserAccessTokenHandler,
    private readonly logoutCurrentHandler: LogoutUserSessionHandler,
    private readonly logoutAllHandler: LogoutAllUserSessionsHandler,
    private readonly updateHandler: UpdateUserFieldHandler,
    private readonly getProfileHandler: GetUserProfileHandler,
    private readonly changeEmailHandler: ChangeUserEmailHandler,
    private readonly changePasswordHandler: ChangeUserPasswordHandler,
    private readonly deleteSelfHandler: DeleteUserSelfHandler,
    private readonly getFieldsHandler: GetUserFieldsHandler,
    private readonly getFieldHandler: GetUserFieldHandler,

    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterUserSchema.parse(req.body)

    const params = ProjectIdParamSchema.parse(req.params)

    const { accessToken, refreshToken, userId } = await this.registerHandler.execute(
      new RegisterUserCommand(
        params.projectId,
        body.email,
        body.password,
        body.fields,
        req.headers['user-agent'] ?? null,
        req.ip ?? null,
        body.deviceName ?? null,
      ),
    )

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
      maxAge: this.serverConfig.cookieMaxAge,
    })

    res.status(201).json({
      userId,
      accessToken,
    })
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = LoginUserSchema.parse(req.body)

    const params = ProjectIdParamSchema.parse(req.params)

    const { accessToken, refreshToken, userId } = await this.loginHandler.execute(
      new LoginUserCommand(
        body.password,
        body.email,
        params.projectId,
        req.headers['user-agent'] ?? null,
        req.ip ?? null,
        body.deviceName ?? null,
      ),
    )

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
      maxAge: this.serverConfig.cookieMaxAge,
    })

    res.status(200).json({
      userId,
      accessToken,
    })
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const cookies = RefreshTokenCookiesSchema.parse(req.cookies)

    const { accessToken, refreshToken } = await this.refreshHandler.execute(
      new RefreshUserAccessTokenCommand(cookies.refresh_token),
    )

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
      maxAge: this.serverConfig.cookieMaxAge,
    })

    res.status(200).json({ accessToken })
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const result = await this.logoutAllHandler.execute(
      new LogoutAllUserSessionsCommand(req.userAuth.userId),
    )
    res.status(200).json(result)
  }

  async logoutCurrent(req: Request, res: Response): Promise<void> {
    const result = await this.logoutCurrentHandler.execute(
      new LogoutUserSessionCommand(req.userAuth.sessionId),
    )
    res.status(200).json(result)
  }

  async update(req: Request, res: Response): Promise<void> {
    const body = UpdateUserFieldBodySchema.parse(req.body)

    const params = UpdateUserFieldParamSchema.parse(req.params)

    const result = await this.updateHandler.execute(
      new UpdateUserFieldCommand(
        req.userAuth.userId,
        req.userAuth.projectId,
        params.name,
        String(body.value),
      ),
    )

    res.status(200).json(result)
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const result = await this.getProfileHandler.execute(
      new GetUserProfileQuery(req.userAuth.userId),
    )
    res.status(200).json(result)
  }

  async deleteSelf(req: Request, res: Response): Promise<void> {
    const body = DeleteUserSelfSchema.parse(req.body)

    const result = await this.deleteSelfHandler.execute(
      new DeleteUserSelfCommand(req.userAuth.userId, body.password),
    )

    res.status(200).json(result)
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const body = ChangeUserPasswordSchema.parse(req.body)

    const result = await this.changePasswordHandler.execute(
      new ChangeUserPasswordCommand(
        req.userAuth.userId,
        req.userAuth.projectId,
        body.currentPassword,
        body.newPassword,
      ),
    )

    res.status(200).json(result)
  }

  async getField(req: Request, res: Response): Promise<void> {
    const params = UpdateUserFieldParamSchema.parse(req.params)
    const result = await this.getFieldHandler.execute(
      new GetUserFieldQuery(req.userAuth.userId, req.userAuth.projectId, params.name),
    )
    res.status(200).json(result)
  }

  async getFields(req: Request, res: Response): Promise<void> {
    const result = await this.getFieldsHandler.execute(
      new GetUserFieldsQuery(req.userAuth.userId, req.userAuth.projectId),
    )
    res.status(200).json(result)
  }

  async changeEmail(req: Request, res: Response): Promise<void> {
    const body = ChangeUserEmailSchema.parse(req.body)

    const result = await this.changeEmailHandler.execute(
      new ChangeUserEmailCommand(
        req.userAuth.userId,
        req.userAuth.projectId,
        body.newEmail,
        body.password,
      ),
    )

    res.status(200).json(result)
  }
}
