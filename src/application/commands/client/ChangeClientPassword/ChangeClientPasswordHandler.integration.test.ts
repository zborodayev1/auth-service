import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ChangeClientPasswordHandler } from './ChangeClientPasswordHandler'
import { ChangeClientPasswordCommand } from './ChangeClientPasswordCommand'
import { LoginClientHandler } from '../LoginClient/LoginClientHandler'
import { LoginClientCommand } from '../LoginClient/LoginClientCommand'
import { type RegisterClientResult, RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'

const container = getTestContainer()
const handler = container.get(ChangeClientPasswordHandler)
const registerHandler = container.get(RegisterClientHandler)
const loginHandler = container.get(LoginClientHandler)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

describe('ChangeClientPasswordHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('changes password successfully', async () => {
    const { clientId } = await seed()

    const result = await handler.execute(
      new ChangeClientPasswordCommand(clientId, VALID.password, 'newpassword456'),
    )

    expect(result.success).toBe(true)
  })

  it('new password works for login after change', async () => {
    const { clientId } = await seed()
    await handler.execute(
      new ChangeClientPasswordCommand(clientId, VALID.password, 'newpassword456'),
    )

    await expect(
      loginHandler.execute(new LoginClientCommand('newpassword456', VALID.email, null, null, null)),
    ).resolves.toBeTruthy()
  })

  it('old password no longer works after change', async () => {
    const { clientId } = await seed()
    await handler.execute(
      new ChangeClientPasswordCommand(clientId, VALID.password, 'newpassword456'),
    )

    await expect(
      loginHandler.execute(new LoginClientCommand(VALID.password, VALID.email, null, null, null)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for wrong current password', async () => {
    const { clientId } = await seed()

    await expect(
      handler.execute(new ChangeClientPasswordCommand(clientId, 'wrongpassword', 'newpassword456')),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws ConflictError when new password same as current', async () => {
    const { clientId } = await seed()

    await expect(
      handler.execute(new ChangeClientPasswordCommand(clientId, VALID.password, VALID.password)),
    ).rejects.toThrow(ConflictError)
  })
})
