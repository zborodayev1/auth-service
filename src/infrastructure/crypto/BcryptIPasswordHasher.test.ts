import { describe, expect, it } from 'vitest'
import { BcryptPasswordHasher } from './BcryptIPasswordHasher'
import type { ServerConfig } from '@config/server/server'

const config = {
  bcryptRounds: 1,
} as unknown as ServerConfig

const makeHasher = (): BcryptPasswordHasher => new BcryptPasswordHasher(config)

describe('BcryptPasswordHasher', () => {
  describe('hash()', () => {
    it('returns a bcrypt hash string', async () => {
      const hasher = makeHasher()
      const hash = await hasher.hash('mypassword')

      expect(hash).toMatch(/^\$2b\$/)
    })

    it('returns different hash for same input (salt randomness)', async () => {
      const hasher = makeHasher()
      const hash1 = await hasher.hash('mypassword')
      const hash2 = await hasher.hash('mypassword')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verify()', () => {
    it('returns true for correct password', async () => {
      const hasher = makeHasher()
      const hash = await hasher.hash('mypassword')
      const result = await hasher.verify('mypassword', hash)

      expect(result).toBe(true)
    })

    it('returns false for wrong password', async () => {
      const hasher = makeHasher()
      const hash = await hasher.hash('mypassword')
      const result = await hasher.verify('wrongpassword', hash)

      expect(result).toBe(false)
    })

    it('returns false for empty password against real hash', async () => {
      const hasher = makeHasher()
      const hash = await hasher.hash('mypassword')
      const result = await hasher.verify('', hash)

      expect(result).toBe(false)
    })
  })
})
