export interface UserAccessTokenPayload {
  userId: string
  projectId: string
  sessionId: string
}

export interface UserAccessTokenService {
  sign(userId: string, projectId: string, sessionId: string, projectJwtSecret: string): string
  verify(token: string, projectJwtSecret: string): UserAccessTokenPayload
  decodeUnverified(token: string): { projectId: string } | null
}

export const UserAccessTokenService: unique symbol = Symbol('UserAccessTokenService')
