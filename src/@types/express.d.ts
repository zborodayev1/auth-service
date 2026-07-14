import type { AccessTokenPayload } from '@ports/AccessTokenService'

declare global {
  namespace Express {
    interface Request {
      auth: AccessTokenPayload
    }
  }
}

export {}
