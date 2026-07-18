import type { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientSchema } from '../validators/client/RegisterClientValidator'
import { RegisterClientCommand } from '@app/commands/client/RegisterClient/RegisterClientCommand'
import type { Request, Response } from 'express'
import { LoginClientSchema } from '../validators/client/LoginClientValidator'
import type { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { LoginClientCommand } from '@app/commands/client/LoginClient/LoginClientCommand'
import { ChangeClientEmailSchema } from '../validators/client/ChangeClientEmailValidator'
import type { ChangeClientEmailHandler } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailHandler'
import { ChangeClientEmailCommand } from '@app/commands/client/ChangeClientEmail/ChangeClientEmailCommand'
import { ChangeClientPasswordSchema } from '../validators/client/ChangeClientPasswordValidator'
import type { ChangeClientPasswordHandler } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordHandler'
import { ChangeClientPasswordCommand } from '@app/commands/client/ChangeClientPassword/ChangeClientPasswordCommand'
import type { LogoutAllSessionsHandler } from '@app/commands/client/LogoutAllSessions/LogoutAllSessionsHandler'
import { LogoutAllSessionsCommand } from '@app/commands/client/LogoutAllSessions/LogoutAllSessionsCommand'
import type { LogoutCurrentSessionHandler } from '@app/commands/client/LogoutCurrentSession/LogoutCurrentSessionHandler'
import { LogoutCurrentSessionCommand } from '@app/commands/client/LogoutCurrentSession/LogoutCurrentSessionCommand'
import type { RefreshAccessTokenHandler } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenHandler'
import { RefreshAccessTokenCommand } from '@app/commands/client/RefreshAccessToken/RefreshAccessTokenCommand'
import { RefreshTokenCookiesSchema } from '../validators/client/RefreshAccessTokenValidator'
import { inject, injectable } from 'inversify'
import { ServerConfig } from '@config/server'

@injectable()
export class ClientController {
  constructor(
    private readonly registerHandler: RegisterClientHandler,
    private readonly loginHandler: LoginClientHandler,
    private readonly changeEmailHandler: ChangeClientEmailHandler,
    private readonly changePasswordHandler: ChangeClientPasswordHandler,
    private readonly logoutAllHandler: LogoutAllSessionsHandler,
    private readonly logoutCurrentHandler: LogoutCurrentSessionHandler,
    private readonly refreshHandler: RefreshAccessTokenHandler,

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
      maxAge: 60 * 60 * 100,
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
      maxAge: 60 * 60 * 100,
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
      new LogoutAllSessionsCommand(req.auth.sessionId, req.auth.clientId),
    )
    res.status(200).json(result)
  }

  async logoutCurrent(req: Request, res: Response): Promise<void> {
    const result = await this.logoutCurrentHandler.execute(
      new LogoutCurrentSessionCommand(req.auth.sessionId, req.auth.clientId),
    )
    res.status(200).json(result)
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const cookies = RefreshTokenCookiesSchema.parse(req.cookies)

    const result = await this.refreshHandler.execute(
      new RefreshAccessTokenCommand(cookies.refresh_token),
    )

    res.status(200).json(result)
  }
}
