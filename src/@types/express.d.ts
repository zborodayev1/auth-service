import type { ClientAccessTokenPayload } from '@ports/ClientAccessTokenService'
import type { UserAccessTokenPayload } from '@ports/UserAccessTokenService'

declare global {
  namespace Express {
    interface Request {
      auth: ClientAccessTokenPayload
      userAuth: UserAccessTokenPayload
    }
  }
}

export {}
