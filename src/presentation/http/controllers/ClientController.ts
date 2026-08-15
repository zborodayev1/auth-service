import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientSchema } from '../validators/client/RegisterClientValidator'
import { RegisterClientCommand } from '@app/commands/client/RegisterClient/RegisterClientCommand'
import type { Request, Response } from 'express'
import { LoginClientSchema } from '../validators/client/LoginClientValidator'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { LoginClientCommand } from '@app/commands/client/LoginClient/LoginClientCommand'
import { ChangeClientEmailSchema } from '../validators/client/ChangeClientEmailValidator'
import { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { ChangeClientEmailCommand } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailCommand'
import { ChangeClientPasswordSchema } from '../validators/client/ChangeClientPasswordValidator'
import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { ChangeClientPasswordCommand } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordCommand'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { LogoutAllClientSessionsCommand } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsCommand'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { LogoutCurrentClientSessionCommand } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionCommand'
import { RefreshClientAccessTokenHandler } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenCommand'
import { RefreshTokenCookiesSchema } from '../validators/refreshToken/RefreshTokenCookies'
import { inject, injectable } from 'inversify'
import { ServerConfig } from '@config/server/server'
import { GetClientProjectsHandler } from '@app/queries/client/GetClientProjects/GetClientProjectsHandler'
import { GetClientProjectsQuery } from '@app/queries/client/GetClientProjects/GetClientProjectsQuery'
import { GetClientProfileQuery } from '@app/queries/client/GetClientProfile/GetClientProfileQuery'
import { GetClientProfileHandler } from '@app/queries/client/GetClientProfile/GetClientProfileHandler'
import { ChangeClientNameSchema } from '../validators/client/ChangeClientNameValidator'
import { RenameClientHandler } from '@app/commands/client/RenameClient/RenameClientHandler'
import { RenameClientCommand } from '@app/commands/client/RenameClient/RenameClientCommand'
import { GetClientSessionsHandler } from '@app/queries/client/GetClientSessions/GetClientSessionsHandler'
import { GetClientSessionsQuery } from '@app/queries/client/GetClientSessions/GetClientSessionsQuery'
import { RevokeClientSessionHandler } from '@app/commands/client/RevokeClientSession/RevokeClientSessionHandler'
import { RevokeClientSessionCommand } from '@app/commands/client/RevokeClientSession/RevokeClientSessionCommand'
import { SessionIdParamSchema } from '../validators/session/SessionIdParamValidator'

@injectable()
export class ClientController {
  constructor(
    @inject(RegisterClientHandler)
    private readonly registerHandler: RegisterClientHandler,
    @inject(LoginClientHandler)
    private readonly loginHandler: LoginClientHandler,
    @inject(ChangeClientEmailHandler)
    private readonly changeEmailHandler: ChangeClientEmailHandler,
    @inject(ChangeClientPasswordHandler)
    private readonly changePasswordHandler: ChangeClientPasswordHandler,
    @inject(LogoutAllClientSessionsHandler)
    private readonly logoutAllHandler: LogoutAllClientSessionsHandler,
    @inject(LogoutCurrentClientSessionHandler)
    private readonly logoutCurrentHandler: LogoutCurrentClientSessionHandler,
    @inject(RefreshClientAccessTokenHandler)
    private readonly refreshHandler: RefreshClientAccessTokenHandler,
    @inject(GetClientProfileHandler)
    private readonly getProfileHandler: GetClientProfileHandler,
    @inject(GetClientProjectsHandler)
    private readonly getProjectsHandler: GetClientProjectsHandler,
    @inject(RenameClientHandler)
    private readonly changeNameHandler: RenameClientHandler,
    @inject(GetClientSessionsHandler)
    private readonly getSessionsHandler: GetClientSessionsHandler,
    @inject(RevokeClientSessionHandler)
    private readonly revokeSessionHandler: RevokeClientSessionHandler,

    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {}

  async register(req: Request, res: Response): Promise<void> {
    const body = RegisterClientSchema.parse(req.body)

    const { accessToken, refreshToken, clientId } = await this.registerHandler.execute(
      new RegisterClientCommand(
        body.name,
        body.email,
        body.password,
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
      clientId,
      accessToken,
    })
  }

  async login(req: Request, res: Response): Promise<void> {
    const body = LoginClientSchema.parse(req.body)

    const { accessToken, refreshToken, clientId } = await this.loginHandler.execute(
      new LoginClientCommand(
        body.password,
        body.email,
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
      clientId,
      accessToken,
    })
  }

  async changeEmail(req: Request, res: Response): Promise<void> {
    const body = ChangeClientEmailSchema.parse(req.body)

    const result = await this.changeEmailHandler.execute(
      new ChangeClientEmailCommand(req.auth.clientId, body.newEmail, body.password),
    )

    res.status(200).json(result)
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const body = ChangeClientPasswordSchema.parse(req.body)

    const result = await this.changePasswordHandler.execute(
      new ChangeClientPasswordCommand(req.auth.clientId, body.currentPassword, body.newPassword),
    )

    res.status(200).json(result)
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const result = await this.logoutAllHandler.execute(
      new LogoutAllClientSessionsCommand(req.auth.clientId),
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
      new LogoutCurrentClientSessionCommand(req.auth.sessionId, req.auth.clientId),
    )

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
    })

    res.status(200).json(result)
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const cookies = RefreshTokenCookiesSchema.parse(req.cookies)

    const { accessToken, refreshToken } = await this.refreshHandler.execute(
      new RefreshClientAccessTokenCommand(cookies.refresh_token),
    )

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.serverConfig.isProduction,
      sameSite: 'strict',
      maxAge: this.serverConfig.cookieMaxAge,
    })

    res.status(200).json({ accessToken })
  }

  async getProjects(req: Request, res: Response): Promise<void> {
    const projects = await this.getProjectsHandler.execute(
      new GetClientProjectsQuery(req.auth.clientId),
    )

    res.status(200).json(projects)
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await this.getProfileHandler.execute(
      new GetClientProfileQuery(req.auth.clientId),
    )

    res.status(200).json(profile)
  }

  async changeName(req: Request, res: Response): Promise<void> {
    const body = ChangeClientNameSchema.parse(req.body)

    const result = await this.changeNameHandler.execute(
      new RenameClientCommand(req.auth.clientId, body.name),
    )

    res.status(200).json(result)
  }

  async getSessions(req: Request, res: Response): Promise<void> {
    const sessions = await this.getSessionsHandler.execute(
      new GetClientSessionsQuery(req.auth.clientId, req.auth.sessionId),
    )

    res.status(200).json(sessions)
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    const { sessionId } = SessionIdParamSchema.parse(req.params)

    const result = await this.revokeSessionHandler.execute(
      new RevokeClientSessionCommand(sessionId, req.auth.clientId, req.auth.sessionId),
    )

    res.status(200).json(result)
  }
}
