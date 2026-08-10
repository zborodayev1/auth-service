import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ChangeUserEmailHandler } from './ChangeUserEmailHandler'
import { ChangeUserEmailCommand } from './ChangeUserEmailCommand'
import { ConflictError } from '@shared/errors/ConflictError'
import { UnauthorizedError } from '@shared/errors/UnauthorizedError'
import { getTestContainer, disconnectTestDb } from '../../../../tests/helpers/container'
import { truncateAll } from '../../../../tests/helpers/db'
import { seedUser, SEED } from '../../../../tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(ChangeUserEmailHandler)

describe('ChangeUserEmailHandler', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('changes email with valid password', async () => {
    const { userId, projectId } = await seedUser(container)

    const result = await handler.execute(
      new ChangeUserEmailCommand(userId, projectId, 'new@example.com', SEED.user.password),
    )

    expect(result.email).toBe('new@example.com')
  })

  it('throws UnauthorizedError for wrong password', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(new ChangeUserEmailCommand(userId, projectId, 'new@example.com', 'wrongpassword')),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws ConflictError when new email already taken in same project', async () => {
    const { userId, projectId } = await seedUser(container)

    await expect(
      handler.execute(new ChangeUserEmailCommand(userId, projectId, SEED.user.email, SEED.user.password)),
    ).rejects.toThrow(ConflictError)
  })
})
