import { injectable, inject } from 'inversify'
import type { Request, Response } from 'express'

import { ServerConfig } from '@config/server/server'

import { ConfirmClientEmailChangeHandler } from '@app/commands/client/ChangeEmail/ConfirmClientEmailChange/ConfirmClientEmailChangeHandler'
import { ConfirmClientEmailChangeCommand } from '@app/commands/client/ChangeEmail/ConfirmClientEmailChange/ConfirmClientEmailChangeCommand'
import { RequestClientEmailChangeHandler } from '@app/commands/client/ChangeEmail/RequestClientEmailChange/RequestClientEmailChangeHandler'
import { RequestClientEmailChangeCommand } from '@app/commands/client/ChangeEmail/RequestClientEmailChange/RequestClientEmailChangeCommand'
import { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { ChangeClientPasswordCommand } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordCommand'
import { ConfirmClientForgotPasswordHandler } from '@app/commands/client/ForgotPassword/ConfirmClientForgotPassword/ConfirmClientForgotPasswordHandler'
import { ConfirmClientForgotPasswordCommand } from '@app/commands/client/ForgotPassword/ConfirmClientForgotPassword/ConfirmClientForgotPasswordCommand'
import { RequestClientForgotPasswordHandler } from '@app/commands/client/ForgotPassword/RequestClientForgotPassword/RequestClientForgotPasswordHandler'
import { RequestClientForgotPasswordCommand } from '@app/commands/client/ForgotPassword/RequestClientForgotPassword/RequestClientForgotPasswordCommand'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { LoginClientCommand } from '@app/commands/client/LoginClient/LoginClientCommand'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { LogoutAllClientSessionsCommand } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsCommand'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { LogoutCurrentClientSessionCommand } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionCommand'
import { RefreshClientAccessTokenHandler } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenHandler'
import { RefreshClientAccessTokenCommand } from '@app/commands/client/RefreshClientAccessToken/RefreshClientAccessTokenCommand'
import { ConfirmRegisterClientHandler } from '@app/commands/client/RegisterClient/ConfirmRegisterClient/ConfirmRegisterClientHandler'
import { ConfirmRegisterClientCommand } from '@app/commands/client/RegisterClient/ConfirmRegisterClient/ConfirmRegisterClientCommand'
import { RequestRegisterClientHandler } from '@app/commands/client/RegisterClient/RequestRegisterClient/RequestRegisterClientHandler'
import { RequestRegisterClientCommand } from '@app/commands/client/RegisterClient/RequestRegisterClient/RequestRegisterClientCommand'
import { RenameClientHandler } from '@app/commands/client/RenameClient/RenameClientHandler'
import { RenameClientCommand } from '@app/commands/client/RenameClient/RenameClientCommand'
import { RevokeClientSessionHandler } from '@app/commands/client/RevokeClientSession/RevokeClientSessionHandler'
import { RevokeClientSessionCommand } from '@app/commands/client/RevokeClientSession/RevokeClientSessionCommand'

import { GetClientProfileHandler } from '@app/queries/client/GetClientProfile/GetClientProfileHandler'
import { GetClientProfileQuery } from '@app/queries/client/GetClientProfile/GetClientProfileQuery'
import { GetClientProjectsHandler } from '@app/queries/client/GetClientProjects/GetClientProjectsHandler'
import { GetClientProjectsQuery } from '@app/queries/client/GetClientProjects/GetClientProjectsQuery'
import { GetClientSessionsHandler } from '@app/queries/client/GetClientSessions/GetClientSessionsHandler'
import { GetClientSessionsQuery } from '@app/queries/client/GetClientSessions/GetClientSessionsQuery'

import { RefreshTokenCookiesSchema } from '../validators/refreshToken/RefreshTokenCookies'
import { SessionIdParamSchema } from '../validators/session/SessionIdParamValidator'
import {
  RequestRegisterClientSchema,
  ConfirmRegisterClientSchema,
  LoginClientSchema,
  RequestChangeClientEmailSchema,
  ChangeClientPasswordSchema,
  ChangeClientNameSchema,
  RequestPasswordResetClientSchema,
  ConfirmPasswordResetClientSchema,
  ConfirmChangeClientEmailSchema,
} from '../validators/client/ClientValidator'
@injectable()
export class ClientController {
  constructor(
    @inject(RequestRegisterClientHandler)
    private readonly requestRegisterHandler: RequestRegisterClientHandler,
    @inject(ConfirmRegisterClientHandler)
    private readonly confirmRegisterHandler: ConfirmRegisterClientHandler,
    @inject(LoginClientHandler)
    private readonly loginHandler: LoginClientHandler,
    @inject(RequestClientEmailChangeHandler)
    private readonly requestEmailChangeHandler: RequestClientEmailChangeHandler,
    @inject(ConfirmClientEmailChangeHandler)
    private readonly confirmEmailChangeHandler: ConfirmClientEmailChangeHandler,
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
    @inject(RequestClientForgotPasswordHandler)
    private readonly requestForgotPasswordHandler: RequestClientForgotPasswordHandler,
    @inject(ConfirmClientForgotPasswordHandler)
    private readonly confirmForgotPasswordHandler: ConfirmClientForgotPasswordHandler,

    @inject(ServerConfig)
    private readonly serverConfig: ServerConfig,
  ) {}

  async requestRegister(req: Request, res: Response): Promise<void> {
    const body = RequestRegisterClientSchema.parse(req.body)

    const result = await this.requestRegisterHandler.execute(
      new RequestRegisterClientCommand(body.name, body.email, body.password),
    )

    res.status(200).json(result)
  }

  async confirmRegister(req: Request, res: Response): Promise<void> {
    const body = ConfirmRegisterClientSchema.parse(req.body)

    const { clientId, accessToken, refreshToken } = await this.confirmRegisterHandler.execute(
      new ConfirmRegisterClientCommand(
        body.token,
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

    res.status(200).json({ clientId, accessToken })
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

  async requestChangeEmail(req: Request, res: Response): Promise<void> {
    const body = RequestChangeClientEmailSchema.parse(req.body)

    const result = await this.requestEmailChangeHandler.execute(
      new RequestClientEmailChangeCommand(req.auth.clientId, body.newEmail, body.password),
    )
    res.status(200).json(result)
  }

  async confirmChangeEmail(req: Request, res: Response): Promise<void> {
    const { token } = ConfirmChangeClientEmailSchema.parse(req.body)
    const result = await this.confirmEmailChangeHandler.execute(
      new ConfirmClientEmailChangeCommand(token),
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

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const body = RequestPasswordResetClientSchema.parse(req.body)

    const { success } = await this.requestForgotPasswordHandler.execute(
      new RequestClientForgotPasswordCommand(body.email),
    )

    res.status(200).json(success)
  }

  async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    const body = ConfirmPasswordResetClientSchema.parse(req.body)

    const { accessToken, refreshToken } = await this.confirmForgotPasswordHandler.execute(
      new ConfirmClientForgotPasswordCommand(
        body.token,
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

    res.status(200).json({ accessToken })
  }
}
