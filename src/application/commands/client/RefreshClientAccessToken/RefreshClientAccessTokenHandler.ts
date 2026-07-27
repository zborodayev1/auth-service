import { inject, injectable } from 'inversify'
import type { RefreshClientAccessTokenCommand } from './RefreshClientAccessTokenCommand'
import { ClientAuthService } from '@services/auth/ClientAuthService'
import { TokenPair } from '@services/auth/types'

@injectable()
export class RefreshClientAccessTokenHandler {
  constructor(
    @inject(ClientAuthService)
    private readonly authService: ClientAuthService,
  ) {}

  async execute(command: RefreshClientAccessTokenCommand): Promise<TokenPair> {
    return await this.authService.refresh(command.rawToken)
  }
}
