import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { GetUserFieldsHandler } from './GetUserFieldsHandler'
import { GetUserFieldsQuery } from './GetUserFieldsQuery'
import { UpdateUserFieldHandler } from '../../../commands/user/UpdateUserField/UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from '../../../commands/user/UpdateUserField/UpdateUserFieldCommand'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, seedUserWithField } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetUserFieldsHandler)
const updateHandler = container.get(UpdateUserFieldHandler)

describe('GetUserFieldsHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('returns empty fields when project has no field definitions', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(new GetUserFieldsQuery(userId, projectId))

    expect(result.fields).toEqual([])
  })

  it('returns field with null value when not yet set', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    const result = await handler.execute(new GetUserFieldsQuery(userId, projectId))

    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]?.id).toBe(fieldId)
    expect(result.fields[0]?.name).toBe('bio')
    expect(result.fields[0]?.value).toBeNull()
  })

  it('returns field with value after update', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    await updateHandler.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'developer'))

    const result = await handler.execute(new GetUserFieldsQuery(userId, projectId))

    expect(result.fields[0]?.value).toBe('developer')
  })
})
