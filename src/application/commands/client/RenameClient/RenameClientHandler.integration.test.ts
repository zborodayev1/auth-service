import { beforeEach, describe, expect, it } from 'vitest'
import { RenameClientHandler } from './RenameClientHandler'
import { RenameClientCommand } from './RenameClientCommand'
import {
  type RegisterClientResult,
  RegisterClientHandler,
} from '../RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '../RegisterClient/RegisterClientCommand'
import { GetClientProfileHandler } from '../../../queries/client/GetClientProfile/GetClientProfileHandler'
import { GetClientProfileQuery } from '../../../queries/client/GetClientProfile/GetClientProfileQuery'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer } from '@tests/helpers/container'
import { truncateAll } from '@tests/helpers/db'

const container = getTestContainer()
const handler = container.get(RenameClientHandler)
const registerHandler = container.get(RegisterClientHandler)
const profileHandler = container.get(GetClientProfileHandler)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

describe('RenameClientHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  it('renames client successfully', async () => {
    const { clientId } = await seed()

    const result = await handler.execute(new RenameClientCommand(clientId, 'Updated Client Name'))

    expect(result.name).toBe('Updated Client Name')
  })

  it('persists new name — profile reflects change', async () => {
    const { clientId } = await seed()
    const result = await handler.execute(new RenameClientCommand(clientId, 'Updated Client Name'))

    const profile = await profileHandler.execute(new GetClientProfileQuery(clientId))

    expect(profile.name).toBe('Updated Client Name')
    expect(result.name).toBe(profile.name)
  })

  it('throws NotFoundError for unknown clientId', async () => {
    await expect(
      handler.execute(
        new RenameClientCommand('00000000-0000-0000-0000-000000000000', 'New Name Client'),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
