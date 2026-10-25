import { PrismaProvider } from '@infra/persistence/prisma/PrismaProvider'
import { TransactionContext } from '@infra/persistence/prisma/TransactionContext'

import { TestContainer } from './TestContainer'
import { TestDatabase } from './TestDatabase'

import { generateSchemaName, createAndMigrateSchema, dropSchema } from './TestSchema'

import type { Express } from 'express'
import { TestTransaction } from './TestTransaction'

export class TestEnvironment {
  readonly schema: string

  private readonly connectionString: string

  private _container: TestContainer | null = null
  private _database: TestDatabase | null = null
  private _transaction: TestTransaction | null = null

  constructor() {
    this.schema = generateSchemaName()
    this.connectionString = process.env['DATABASE_URL'] ?? ''
  }

  async start(): Promise<void> {
    process.env['TEST_SCHEMA'] = this.schema

    await createAndMigrateSchema(this.connectionString, this.schema)

    this._container = new TestContainer()

    this._database = new TestDatabase(
      this._container.container.get(PrismaProvider),
      this._container.container.get(TransactionContext),
    )

    this._transaction = new TestTransaction(
      this._container.container.get(PrismaProvider),
      this._container.container.get(TransactionContext),
      this.schema,
    )
  }

  async stop(): Promise<void> {
    if (!this._database) {
      return
    }

    await this._database.disconnect()

    await dropSchema(this.connectionString, this.schema)

    this._container = null
    this._database = null
  }

  get container(): TestContainer {
    if (!this._container) {
      throw new Error('TestEnvironment has not been started')
    }

    return this._container
  }

  get database(): TestDatabase {
    if (!this._database) {
      throw new Error('TestEnvironment has not been started')
    }

    return this._database
  }

  get transaction(): TestTransaction {
    if (!this._transaction) {
      throw new Error('TestEnvironment has not been started')
    }

    return this._transaction
  }

  get app(): Express {
    return this.container.app
  }
}
