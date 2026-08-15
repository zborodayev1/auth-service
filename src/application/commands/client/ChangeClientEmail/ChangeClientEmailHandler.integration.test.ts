import { describe, expect, it } from 'vitest'
import { ChangeClientEmailHandler } from './ChangeClientEmailHandler'
import { ChangeClientEmailCommand } from './ChangeClientEmailCommand'
import {
  type RegisterClientResult,
  RegisterClientHandler,
} from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { LoginClientHandler } from '../LoginClient/LoginClientHandler'
import { LoginClientCommand } from '../LoginClient/LoginClientCommand'

const container = getTestContainer()
const handler = container.get(ChangeClientEmailHandler)
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

describe('ChangeClientEmailHandler', () => {
  useTransactionIsolation(container)

  it('changes email with valid password', async () => {
    const { clientId } = await seed()

    const result = await handler.execute(
      new ChangeClientEmailCommand(clientId, 'new@example.com', VALID.password),
    )

    expect(result.email).toBe('new@example.com')
  })

  it('new email persists — login with new email works', async () => {
    const { clientId } = await seed()

    await handler.execute(new ChangeClientEmailCommand(clientId, 'new@example.com', VALID.password))

    await expect(
      loginHandler.execute(
        new LoginClientCommand(VALID.password, 'new@example.com', null, null, null),
      ),
    ).resolves.toBeTruthy()
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { clientId } = await seed()

    await expect(
      handler.execute(new ChangeClientEmailCommand(clientId, 'new@example.com', 'wrongpassword')),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws NotFoundError for unknown clientId', async () => {
    await expect(
      handler.execute(
        new ChangeClientEmailCommand(
          '00000000-0000-0000-0000-000000000000',
          'new@example.com',
          VALID.password,
        ),
      ),
    ).rejects.toThrow(NotFoundError)
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
