import { describe, expect, it } from 'vitest'
import { GetClientProfileHandler } from './GetClientProfileHandler'
import { GetClientProfileQuery } from './GetClientProfileQuery'
import type { RegisterClientResult } from '../../../commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientHandler } from '../../../commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../../../commands/client/RegisterClient/RegisterClientCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'

const container = getTestContainer()
const handler = container.get(GetClientProfileHandler)
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

describe('GetClientProfileHandler', () => {
  useTransactionIsolation(container)

  it('returns correct profile fields', async () => {
    const { clientId } = await seed()

    const profile = await handler.execute(new GetClientProfileQuery(clientId))

    expect(profile.id).toBe(clientId)
    expect(profile.name).toBe(VALID.name)
    expect(profile.email).toBe(VALID.email)
    expect(profile.createdAt).toBeInstanceOf(Date)
  })

  it('throws NotFoundError for unknown clientId', async () => {
    await expect(
      handler.execute(new GetClientProfileQuery('00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(NotFoundError)
  })
})
