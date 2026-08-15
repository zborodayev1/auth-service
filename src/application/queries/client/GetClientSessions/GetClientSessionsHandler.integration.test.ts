import { describe, expect, it } from 'vitest'
import { GetClientSessionsHandler } from './GetClientSessionsHandler'
import { GetClientSessionsQuery } from './GetClientSessionsQuery'
import { type RegisterClientResult, RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '@app/commands/client/RegisterClient/RegisterClientCommand'
import { LoginClientHandler } from '@app/commands/client/LoginClient/LoginClientHandler'
import { LoginClientCommand } from '@app/commands/client/LoginClient/LoginClientCommand'
import { LogoutCurrentClientSessionHandler } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionHandler'
import { LogoutCurrentClientSessionCommand } from '@app/commands/client/LogoutCurrentClientSession/LogoutCurrentClientSessionCommand'
import { LogoutAllClientSessionsHandler } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsHandler'
import { LogoutAllClientSessionsCommand } from '@app/commands/client/LogoutAllClientSessions/LogoutAllClientSessionsCommand'
import type { ClientAccessTokenService as IClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { ClientAccessTokenService } from '@ports/ClientAccessTokenService'
import { getTestContainer } from '@tests/helpers/container'
import { useTransactionIsolation } from '@tests/helpers/db'

const container = getTestContainer()
const handler = container.get(GetClientSessionsHandler)
const registerHandler = container.get(RegisterClientHandler)
const loginHandler = container.get(LoginClientHandler)
const logoutCurrentHandler = container.get(LogoutCurrentClientSessionHandler)
const logoutAllHandler = container.get(LogoutAllClientSessionsHandler)
const accessTokenService = container.get<IClientAccessTokenService>(ClientAccessTokenService)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const seed = (): Promise<RegisterClientResult> =>
  registerHandler.execute(
    new RegisterClientCommand(VALID.name, VALID.email, VALID.password, null, null, null),
  )

const login = (): ReturnType<typeof loginHandler.execute> =>
  loginHandler.execute(new LoginClientCommand(VALID.password, VALID.email, null, null, null))

describe('GetClientSessionsHandler', () => {
  useTransactionIsolation(container)

  it('returns empty array when client has no active sessions', async () => {
    const { clientId, accessToken } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)
    await logoutAllHandler.execute(new LogoutAllClientSessionsCommand(clientId))

    const result = await handler.execute(new GetClientSessionsQuery(clientId, sessionId))

    expect(result).toHaveLength(0)
  })

  it('returns active sessions with correct shape', async () => {
    const { clientId, accessToken } = await seed()
    const { sessionId } = accessTokenService.verify(accessToken)

    const result = await handler.execute(new GetClientSessionsQuery(clientId, sessionId))

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
    const { clientId, accessToken: at1 } = await seed()
    await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)

    const result = await handler.execute(new GetClientSessionsQuery(clientId, sessionId1))

    expect(result).toHaveLength(2)
  })

  it('marks current session with isCurrent true', async () => {
    const { clientId, accessToken: at1 } = await seed()
    await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)

    const result = await handler.execute(new GetClientSessionsQuery(clientId, sessionId1))

    const current = result.find((s) => s.id === sessionId1)
    const other = result.find((s) => s.id !== sessionId1)
    expect(current?.isCurrent).toBe(true)
    expect(other?.isCurrent).toBe(false)
  })

  it('excludes revoked sessions', async () => {
    const { clientId, accessToken: at1 } = await seed()
    const { accessToken: at2 } = await login()
    const { sessionId: sessionId1 } = accessTokenService.verify(at1)
    const { sessionId: sessionId2 } = accessTokenService.verify(at2)

    await logoutCurrentHandler.execute(
      new LogoutCurrentClientSessionCommand(sessionId1, clientId),
    )

    const result = await handler.execute(new GetClientSessionsQuery(clientId, sessionId2))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(sessionId2)
  })

  it('returns only sessions belonging to the querying client', async () => {
    const { clientId: clientIdA, accessToken: atA } = await seed()
    const { sessionId: sessionIdA } = accessTokenService.verify(atA)

    await registerHandler.execute(
      new RegisterClientCommand('Other Client', 'other@example.com', VALID.password, null, null, null),
    )

    const result = await handler.execute(new GetClientSessionsQuery(clientIdA, sessionIdA))

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(sessionIdA)
  })
})
