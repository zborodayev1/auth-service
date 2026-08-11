import { config } from 'dotenv'
import { afterAll } from 'vitest'
import { disconnectTestDb } from './helpers/container'

config({ path: '.env.test' })

afterAll(async () => {
  await disconnectTestDb()
})
