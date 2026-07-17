import type { Request } from 'express'

export type RequestContext = {
  [K in 'method' | 'ip' | 'params' | 'query' | 'originalUrl']: Request[K]
} & {
  userAgent: string | undefined
  auth: Request['auth']
}
