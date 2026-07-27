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

@injectable()
export class UserController {
  constructor(
    private readonly registerHandler: RegisterUserHandler,
    private readonly loginHandler: LoginUserHandler,
    private readonly refreshHandler: RefreshUserAccessTokenHandler,
    private readonly logoutCurrentHandler: LogoutUserSessionHandler,
    private readonly logoutAllHandler: LogoutAllUserSessionsHandler,
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
}
