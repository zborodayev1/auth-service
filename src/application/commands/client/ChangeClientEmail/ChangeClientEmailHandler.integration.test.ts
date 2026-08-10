import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ChangeClientEmailHandler } from './ChangeClientEmailHandler'
import { ChangeClientEmailCommand } from './ChangeClientEmailCommand'
import { type RegisterClientResult, RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'

const container = getTestContainer()
const handler = container.get(ChangeClientEmailHandler)
const registerHandler = container.get(RegisterClientHandler)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

describe('ChangeClientEmailHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('changes email with valid password', async () => {
    const { clientId } = await seed()

    const result = await handler.execute(
      new ChangeClientEmailCommand(clientId, 'new@example.com', VALID.password),
    )

    expect(result.email).toBe('new@example.com')
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { clientId } = await seed()

    await expect(
      handler.execute(new ChangeClientEmailCommand(clientId, 'new@example.com', 'wrongpassword')),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws ConflictError when new email already taken', async () => {
    const { clientId } = await seed()
    await registerHandler.execute(
      new RegisterClientCommand(VALID.name, 'other@example.com', VALID.password, null, null, null),
    )

    await expect(
      handler.execute(new ChangeClientEmailCommand(clientId, 'other@example.com', VALID.password)),
    ).rejects.toThrow(ConflictError)
  })
})
