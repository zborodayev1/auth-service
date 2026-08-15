import { config } from 'dotenv'
import { beforeAll, afterAll } from 'vitest'
import { generateSchemaName, createAndMigrateSchema, dropSchema } from './helpers/testSchema'
import { disconnectTestDb } from './helpers/container'
import { disconnectHttpTestDb } from './helpers/httpContainer'

config({ path: '.env.test' })

const schema = generateSchemaName()
process.env['TEST_SCHEMA'] = schema

const dbUrl = process.env['DATABASE_URL'] ?? ''

beforeAll(async () => {
  await createAndMigrateSchema(dbUrl, schema)
})

afterAll(async () => {
  await disconnectTestDb()
  await disconnectHttpTestDb()
  await dropSchema(dbUrl, schema)
})
