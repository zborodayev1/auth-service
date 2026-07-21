import { inject, injectable } from 'inversify'
import type { RefreshClientAccessTokenCommand } from './RefreshClientAccessTokenCommand'
import { AuthService } from '@services/auth/AuthService'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

@injectable()
export class RefreshClientAccessTokenHandler {
  constructor(
    @inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async execute(command: RefreshClientAccessTokenCommand): Promise<TokenPair> {
    return await this.authService.refresh(command.rawToken)
  }
}
