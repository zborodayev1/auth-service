import { describe, expect, it } from 'vitest'
import { LoginClientHandler } from './LoginClientHandler'
import { LoginClientCommand } from './LoginClientCommand'
import type { RegisterClientResult } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientHandler } from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'

const container = getTestContainer()
const loginHandler = container.get(LoginClientHandler)
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

describe('LoginClientHandler', () => {
  useTransactionIsolation(container)

  it('returns accessToken, refreshToken and clientId on valid credentials', async () => {
    await seed()

    const result = await loginHandler.execute(
      new LoginClientCommand(VALID.password, VALID.email, null, null, null),
    )

    expect(result.accessToken).toBeTruthy()
    expect(result.refreshToken).toBeTruthy()
    expect(result.clientId).toBeTruthy()
  })

  it('throws UnauthorizedError for wrong password', async () => {
    await seed()

    await expect(
      loginHandler.execute(new LoginClientCommand('wrongpassword', VALID.email, null, null, null)),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError for non-existent email', async () => {
    await expect(
      loginHandler.execute(
        new LoginClientCommand(VALID.password, 'nobody@example.com', null, null, null),
      ),
    ).rejects.toThrow(UnauthorizedError)
  })
})
