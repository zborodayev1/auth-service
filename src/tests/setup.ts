import { config } from 'dotenv'
import { afterAll } from 'vitest'

import { TestEnvironment } from './helpers/TestEnvironment'

config({ path: '.env.test' })

export const environment = new TestEnvironment()

await environment.start()

afterAll(async () => {
  await environment.stop()
})
