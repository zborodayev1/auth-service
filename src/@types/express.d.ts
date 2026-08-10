import type { ClientAccessTokenPayload } from '@ports/ClientAccessTokenService'
import type { UserAccessTokenPayload } from '@ports/UserAccessTokenService'
import type { ProjectApiKeyPayload } from '@ports/ProjectApiKeyService'

declare global {
  namespace Express {
    interface Request {
      auth: ClientAccessTokenPayload
      userAuth: UserAccessTokenPayload
      projectAuth?: ProjectApiKeyPayload
    }
  }
}

export {}
