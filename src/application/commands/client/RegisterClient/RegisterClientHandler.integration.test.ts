import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { type RegisterClientResult, RegisterClientHandler } from './RegisterClientHandler'
import { RegisterClientCommand } from './RegisterClientCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'

const container = getTestContainer()
const handler = container.get(RegisterClientHandler)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const register = (overrides?: Partial<typeof VALID>): Promise<RegisterClientResult> =>
  handler.execute(
    new RegisterClientCommand(
      overrides?.name ?? VALID.name,
      overrides?.email ?? VALID.email,
      overrides?.password ?? VALID.password,
      null, null, null,
    ),
  )

describe('RegisterClientHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns clientId, accessToken, refreshToken', async () => {
    const result = await register()

    expect(result.clientId).toBeTruthy()
    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
  })

  it('throws ConflictError on duplicate email', async () => {
    await register()

    await expect(register()).rejects.toThrow(ConflictError)
  })
})
