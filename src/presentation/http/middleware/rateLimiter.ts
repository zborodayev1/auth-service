import rateLimit from 'express-rate-limit'

const skipInTest = (): boolean => process.env['NODE_ENV'] === 'test'

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try later' },
})

export const mutateRequestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try later' },
})

export const queryRequestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skip: skipInTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try later' },
})
