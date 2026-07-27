import { UserAuthService } from '@services/auth/UserAuthService'
import { inject, injectable } from 'inversify'
import { RefreshUserAccessTokenCommand } from './RefreshUserAccessTokenCommand'
import { TokenPair } from '@services/auth/types'

@injectable()
export class RefreshUserAccessTokenHandler {
  constructor(
    @inject(UserAuthService)
    private readonly authService: UserAuthService,
  ) {}

  async execute(command: RefreshUserAccessTokenCommand): Promise<TokenPair> {
    return this.authService.refresh(command.rawToken)
  }
}
