export interface ClientLoginContext {
  clientId: string
  userAgent: string | null
  ipAddress: string | null
  deviceName: string | null
}

export interface UserLoginContext {
  userId: string
  projectId: string
  userAgent: string | null
  ipAddress: string | null
  deviceName: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}
