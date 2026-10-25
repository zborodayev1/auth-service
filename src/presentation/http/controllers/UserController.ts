import { injectable, inject } from 'inversify'
import type { Request, Response } from 'express'

import { ServerConfig } from '@config/server/server'
import { AUTH_ERROR_CODES } from '@shared/errors/ErrorCodes'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'

import { ChangeUserEmailHandler } from '@app/commands/user/ChangeUserEmail/ChangeUserEmailHandler'
import { ChangeUserEmailCommand } from '@app/commands/user/ChangeUserEmail/ChangeUserEmailCommand'
import { ChangeUserPasswordHandler } from '@app/commands/user/ChangeUserPassword/ChangeUserPasswordHandler'
import { ChangeUserPasswordCommand } from '@app/commands/user/ChangeUserPassword/ChangeUserPasswordCommand'
import { DeleteUserSelfHandler } from '@app/commands/user/DeleteUserSelf/DeleteUserSelfHandler'
import { DeleteUserSelfCommand } from '@app/commands/user/DeleteUserSelf/DeleteUserSelfCommand'
import { LoginUserHandler } from '@app/commands/user/LoginUser/LoginUserHandler'
import { LoginUserCommand } from '@app/commands/user/LoginUser/LoginUserCommand'
import { LogoutAllUserSessionsHandler } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler'
import { LogoutAllUserSessionsCommand } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsCommand'
import { LogoutUserSessionHandler } from '@app/commands/user/LogoutUserSession/LogoutUserSessionHandler'
import { LogoutUserSessionCommand } from '@app/commands/user/LogoutUserSession/LogoutUserSessionCommand'
import { RefreshUserAccessTokenHandler } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenHandler'
import { RefreshUserAccessTokenCommand } from '@app/commands/user/RefreshUserAccessToken/RefreshUserAccessTokenCommand'
import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '@app/commands/user/RegisterUser/RegisterUserCommand'
import { RevokeUserSessionHandler } from '@app/commands/user/RevokeUserSession/RevokeUserSessionHandler'
import { RevokeUserSessionCommand } from '@app/commands/user/RevokeUserSession/RevokeUserSessionCommand'
import { SetUserFieldHandler } from '@app/commands/user/SetUserField/SetUserFieldHandler'
import { SetUserFieldCommand } from '@app/commands/user/SetUserField/SetUserFieldCommand'

import { GetUserFieldHandler } from '@app/queries/user/GetUserField/GetUserFieldHandler'
import { GetUserFieldQuery } from '@app/queries/user/GetUserField/GetUserFieldQuery'
import { GetUserFieldsHandler } from '@app/queries/user/GetUserFields/GetUserFieldsHandler'
import { GetUserFieldsQuery } from '@app/queries/user/GetUserFields/GetUserFieldsQuery'
import { GetUserProfileHandler } from '@app/queries/user/GetUserProfile/GetUserProfileHandler'
import { GetUserProfileQuery } from '@app/queries/user/GetUserProfile/GetUserProfileQuery'
import { GetUserSessionsHandler } from '@app/queries/user/GetUserSessions/GetUserSessionsHandler'
import { GetUserSessionsQuery } from '@app/queries/user/GetUserSessions/GetUserSessionsQuery'

import { RefreshTokenCookiesSchema } from '../validators/refreshToken/RefreshTokenCookies'
import { SessionIdParamSchema } from '../validators/session/SessionIdParamValidator'
import {
  RegisterUserSchema,
  LoginUserSchema,
  DeleteUserSelfSchema,
  ChangeUserPasswordSchema,
  ChangeUserEmailSchema,
  SetUserFieldBodySchema,
  UserFieldParamsSchema,
} from '../validators/user/UserValidator'

@injectable()
export class UserController {
  constructor(
    @inject(RegisterUserHandler)
    private readonly registerHandler: RegisterUserHandler,
    @inject(LoginUserHandler)
    private readonly loginHandler: LoginUserHandler,
    @inject(RefreshUserAccessTokenHandler)
    private readonly refreshHandler: RefreshUserAccessTokenHandler,
    @inject(LogoutUserSessionHandler)
    private readonly logoutCurrentHandler: LogoutUserSessionHandler,
    @inject(LogoutAllUserSessionsHandler)
    private readonly logoutAllHandler: LogoutAllUserSessionsHandler,
    @inject(SetUserFieldHandler)
    private readonly setHandler: SetUserFieldHandler,
    @inject(GetUserProfileHandler)
    private readonly getProfileHandler: GetUserProfileHandler,
    @inject(ChangeUserEmailHandler)
    private readonly changeEmailHandler: ChangeUserEmailHandler,
    @inject(ChangeUserPasswordHandler)
    private readonly changePasswordHandler: ChangeUserPasswordHandler,
    @inject(DeleteUserSelfHandler)
    private readonly deleteSelfHandler: DeleteUserSelfHandler,
    @inject(GetUserFieldsHandler)
    private readonly getFieldsHandler: GetUserFieldsHandler,
    @inject(GetUserFieldHandler)
    private readonly getFieldHandler: GetUserFieldHandler,
    @inject(GetUserSessionsHandler)
    private readonly getSessionsHandler: GetUserSessionsHandler,
    @inject(RevokeUserSessionHandler)
    private readonly revokeSessionHandler: RevokeUserSessionHandler,

    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterUserSchema.parse(req.body)

    if (!req.projectAuth)
      throw new UnauthorizedError('Missing API key', AUTH_ERROR_CODES.UNAUTHENTICATED)

    const { accessToken, refreshToken, userId } = await this.registerHandler.execute(
      new RegisterUserCommand(
        req.projectAuth.projectId,
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

    if (!req.projectAuth)
      throw new UnauthorizedError('Missing API key', AUTH_ERROR_CODES.UNAUTHENTICATED)

    const { accessToken, refreshToken, userId } = await this.loginHandler.execute(
      new LoginUserCommand(
        body.password,
        body.email,
        req.projectAuth.projectId,
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
      new LogoutAllUserSessionsCommand(req.userAuth.userId, req.userAuth.projectId),
    )
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
    })

    res.status(200).json(result)
  }

  async logoutCurrent(req: Request, res: Response): Promise<void> {
    const result = await this.logoutCurrentHandler.execute(
      new LogoutUserSessionCommand(req.userAuth.sessionId, req.userAuth.userId),
    )

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
    })

    res.status(200).json(result)
  }

  async setField(req: Request, res: Response): Promise<void> {
    const body = SetUserFieldBodySchema.parse(req.body)

    const params = UserFieldParamsSchema.parse(req.params)

    const result = await this.setHandler.execute(
      new SetUserFieldCommand(
        req.userAuth.userId,
        req.userAuth.projectId,
        params.fieldId,
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
      new DeleteUserSelfCommand(req.userAuth.userId, body.password, req.userAuth.projectId),
    )

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
    })

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
    const params = UserFieldParamsSchema.parse(req.params)
    const result = await this.getFieldHandler.execute(
      new GetUserFieldQuery(req.userAuth.userId, req.userAuth.projectId, params.fieldId),
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

  async getSessions(req: Request, res: Response): Promise<void> {
    const sessions = await this.getSessionsHandler.execute(
      new GetUserSessionsQuery(req.userAuth.userId, req.userAuth.sessionId),
    )

    res.status(200).json(sessions)
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    const { sessionId } = SessionIdParamSchema.parse(req.params)

    const result = await this.revokeSessionHandler.execute(
      new RevokeUserSessionCommand(sessionId, req.userAuth.userId, req.userAuth.sessionId),
    )

    res.status(200).json(result)
  }
}
