import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetUserFieldHandler } from './GetUserFieldHandler'
import { GetUserFieldQuery } from './GetUserFieldQuery'
import { UpdateUserFieldHandler } from '../../../commands/user/UpdateUserField/UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from '../../../commands/user/UpdateUserField/UpdateUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUserWithField } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetUserFieldHandler)
const updateHandler = container.get(UpdateUserFieldHandler)

describe('GetUserFieldHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns field with null value when not yet set', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    const result = await handler.execute(new GetUserFieldQuery(userId, projectId, fieldId))

    expect(result.field.id).toBe(fieldId)
    expect(result.field.name).toBe('bio')
    expect(result.field.value).toBeNull()
  })

  it('returns field with value after update', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    await updateHandler.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'developer'))

    const result = await handler.execute(new GetUserFieldQuery(userId, projectId, fieldId))

    expect(result.field.value).toBe('developer')
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { userId, projectId } = await seedUserWithField(container)

    await expect(
      handler.execute(
        new GetUserFieldQuery(userId, projectId, '00000000-0000-0000-0000-000000000000'),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
