import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { UpdateUserFieldHandler } from './UpdateUserFieldHandler'
import { UpdateUserFieldCommand } from './UpdateUserFieldCommand'
import { NotFoundError } from '@shared/errors/NotFoundError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUserWithField } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(UpdateUserFieldHandler)

describe('UpdateUserFieldHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('saves field value and returns fieldId and value', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    const result = await handler.execute(
      new UpdateUserFieldCommand(userId, projectId, fieldId, 'hello world'),
    )

    expect(result.fieldId).toBe(fieldId)
    expect(result.value).toBe('hello world')
  })

  it('overwrites previous value', async () => {
    const { userId, projectId, fieldId } = await seedUserWithField(container)

    await handler.execute(new UpdateUserFieldCommand(userId, projectId, fieldId, 'first'))
    const result = await handler.execute(
      new UpdateUserFieldCommand(userId, projectId, fieldId, 'second'),
    )

    expect(result.value).toBe('second')
  })

  it('throws NotFoundError for unknown fieldId', async () => {
    const { userId, projectId } = await seedUserWithField(container)

    await expect(
      handler.execute(
        new UpdateUserFieldCommand(userId, projectId, '00000000-0000-0000-0000-000000000000', 'value'),
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
