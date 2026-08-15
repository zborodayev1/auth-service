import { describe, expect, it } from 'vitest'
import { GetUserSessionsHandler } from './GetUserSessionsHandler'
import { GetUserSessionsQuery } from './GetUserSessionsQuery'
import { LoginUserHandler } from '@app/commands/user/LoginUser/LoginUserHandler'
import { LoginUserCommand } from '@app/commands/user/LoginUser/LoginUserCommand'
import { LogoutUserSessionHandler } from '@app/commands/user/LogoutUserSession/LogoutUserSessionHandler'
import { LogoutUserSessionCommand } from '@app/commands/user/LogoutUserSession/LogoutUserSessionCommand'
import { LogoutAllUserSessionsHandler } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsHandler'
import { LogoutAllUserSessionsCommand } from '@app/commands/user/LogoutAllUserSessions/LogoutAllUserSessionsCommand'
import { RegisterUserHandler } from '@app/commands/user/RegisterUser/RegisterUserHandler'
import { RegisterUserCommand } from '@app/commands/user/RegisterUser/RegisterUserCommand'
import jwt from 'jsonwebtoken'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'
import { seedUser, SEED } from '@tests/helpers/userSeed'

const container = getTestContainer()
const handler = container.get(GetUserSessionsHandler)
const loginHandler = container.get(LoginUserHandler)
const logoutSessionHandler = container.get(LogoutUserSessionHandler)
const logoutAllHandler = container.get(LogoutAllUserSessionsHandler)
const registerUserHandler = container.get(RegisterUserHandler)

const getSessionId = (accessToken: string): string =>
  (jwt.decode(accessToken) as { sid: string }).sid

describe('GetUserSessionsHandler', () => {
  useTransactionIsolation(container)

  it('returns empty array when user has no active sessions', async () => {
    const { accessToken, userId, projectId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)
    await logoutAllHandler.execute(new LogoutAllUserSessionsCommand(userId, projectId))

    const result = await handler.execute(new GetUserSessionsQuery(userId, sessionId))

    expect(result).toHaveLength(0)
  })

  it('returns active sessions with correct shape', async () => {
    const { accessToken, userId } = await seedUser(container)
    const sessionId = getSessionId(accessToken)

    const result = await handler.execute(new GetUserSessionsQuery(userId, sessionId))

    expect(result).toHaveLength(1)
    const session = result[0]
    expect(typeof session?.id).toBe('string')
    expect(session?.createdAt).toBeInstanceOf(Date)
    expect('deviceName' in (session ?? {})).toBe(true)
    expect('ipAddress' in (session ?? {})).toBe(true)
    expect('userAgent' in (session ?? {})).toBe(true)
    expect(typeof session?.isCurrent).toBe('boolean')
  })

  it('returns all active sessions', async () => {
    const { accessToken: at1, userId, projectId } = await seedUser(container)
    await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)

    const result = await handler.execute(new GetUserSessionsQuery(userId, sessionId1))

    expect(result).toHaveLength(2)
  })

  it('marks current session with isCurrent true', async () => {
    const { accessToken: at1, userId, projectId } = await seedUser(container)
    await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)

    const result = await handler.execute(new GetUserSessionsQuery(userId, sessionId1))

    const current = result.find((s) => s.id === sessionId1)
    const other = result.find((s) => s.id !== sessionId1)
    expect(current?.isCurrent).toBe(true)
    expect(other?.isCurrent).toBe(false)
  })

  it('excludes revoked sessions', async () => {
    const { accessToken: at1, userId, projectId } = await seedUser(container)
    const { accessToken: at2 } = await loginHandler.execute(
      new LoginUserCommand(SEED.user.password, SEED.user.email, projectId, null, null, null),
    )
    const sessionId1 = getSessionId(at1)
    const sessionId2 = getSessionId(at2)

    await logoutSessionHandler.execute(new LogoutUserSessionCommand(sessionId1, userId))

    const result = await handler.execute(new GetUserSessionsQuery(userId, sessionId2))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(sessionId2)
  })

  it('returns only sessions belonging to the querying user', async () => {
    const { accessToken: at1, userId, projectId } = await seedUser(container)
    const sessionId1 = getSessionId(at1)

    await registerUserHandler.execute(
      new RegisterUserCommand(projectId, 'other@example.com', 'password123', {}, null, null, null),
    )

    const result = await handler.execute(new GetUserSessionsQuery(userId, sessionId1))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(sessionId1)
  })
})
