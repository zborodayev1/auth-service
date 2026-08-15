import { randomUUID } from 'crypto'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations')

export function generateSchemaName(): string {
  return `test_${randomUUID().replace(/-/g, '_')}`
}

export async function createAndMigrateSchema(
  connectionString: string,
  schema: string,
): Promise<void> {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    await client.query(`SET search_path TO "${schema}"`)

    const migrations = readdirSync(MIGRATIONS_DIR)
      .filter((d) => !d.startsWith('.') && d !== 'migration_lock.toml')
      .sort()

    for (const migration of migrations) {
      const sqlPath = join(MIGRATIONS_DIR, migration, 'migration.sql')
      if (!existsSync(sqlPath)) continue
      const sql = readFileSync(sqlPath, 'utf8')
      await client.query(sql)
    }
  } finally {
    await client.end()
  }
}

export async function dropSchema(connectionString: string, schema: string): Promise<void> {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  } finally {
    await client.end()
  }
}
