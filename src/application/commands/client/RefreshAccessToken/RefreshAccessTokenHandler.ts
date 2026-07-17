import { inject, injectable } from 'inversify'
import type { RefreshAccessTokenCommand } from './RefreshAccessTokenCommand'
import { AuthService } from '@services/auth/AuthService'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

@injectable()
export class RefreshAccessTokenHandler {
  constructor(
    @inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  async execute(command: RefreshAccessTokenCommand): Promise<TokenPair> {
    return await this.authService.refresh(command.rawToken)
  }
}
