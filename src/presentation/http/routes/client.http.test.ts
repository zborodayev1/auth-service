import { beforeEach, describe, expect, vi } from 'vitest'
import request from 'supertest'

import { IEmailService } from '@ports/IEmailService'
import type { IEmailService as IEmailServiceType } from '@ports/IEmailService'
import { environment } from '@tests/setup'
import { seedClient } from '@tests/fixtures/client'
import { seedProject } from '@tests/fixtures/project'
import { integrationTest } from '@tests/helpers/integrationTest'
import { getCookie } from '@tests/helpers/getCookie'
import type { LoginClientResult } from '@app/commands/client/LoginClient/LoginClientHandler'

interface Session {
  id: string
  isCurrent: boolean
}

function getCurrentSession(sessions: Session[]): Session {
  const session = sessions.find((session) => session.isCurrent)

  if (!session) {
    throw new Error('Expected current session')
  }

  return session
}

function getOtherSession(sessions: Session[]): Session {
  const session = sessions.find((session) => !session.isCurrent)

  if (!session) {
    throw new Error('Expected another session')
  }

  return session
}

const app = environment.app
const container = environment.container.container
const emailSvc = container.get<IEmailServiceType>(IEmailService)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

let emailToken = ''
let resetToken = ''
let registrationNotice = false

beforeEach(() => {
  emailToken = ''
  resetToken = ''
  registrationNotice = false
})

vi.spyOn(emailSvc, 'sendEmailVerificationEmail').mockImplementation((_to, token) => {
  emailToken = token
  return Promise.resolve()
})

vi.spyOn(emailSvc, 'sendPasswordResetEmail').mockImplementation((_to, token) => {
  resetToken = token
  return Promise.resolve()
})

vi.spyOn(emailSvc, 'sendRegistrationAttemptNotice').mockImplementation(() => {
  registrationNotice = true
  return Promise.resolve()
})

async function login(data = VALID): Promise<LoginClientResult> {
  await seedClient(container, data)

  const res = await request(app).post('/clients/login').send(data)

  expect(res.status).toBe(201)

  return res.body as LoginClientResult
}

function refreshCookie(res: request.Response): string {
  const cookie = getCookie(res.headers['set-cookie'], 'refresh_token')

  expect(cookie).toBeTruthy()
  if (!cookie) {
    throw new Error('Refresh token cookie not found')
  }

  return cookie
}

function expectRefreshCookie(res: request.Response): void {
  const rawCookies: unknown = res.headers['set-cookie']
  const cookies: string[] = Array.isArray(rawCookies)
    ? rawCookies.filter((cookie): cookie is string => typeof cookie === 'string')
    : []

  const cookie = cookies.find((cookie: string) => cookie.startsWith('refresh_token='))

  expect(cookie).toBeTruthy()
  expect(cookie).toContain('HttpOnly')
  expect(cookie).toContain('SameSite=Strict')
}
async function register(): Promise<request.Response> {
  return request(app).post('/clients/register').send(VALID)
}

describe('Client HTTP routes', () => {
  describe('GET /clients/projects', () => {
    integrationTest('returns client projects', async () => {
      const { accessToken, clientId } = await login()

      await seedProject(container, clientId, { name: 'Project 1' })
      await seedProject(container, clientId, { name: 'Project 2' })

      const res = await request(app)
        .get('/clients/projects')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body).toMatchObject([{ name: 'Project 1' }, { name: 'Project 2' }])
    })

    integrationTest('does not return another client projects', async () => {
      const client = await login()
      const other = await login({
        name: VALID.name,
        password: VALID.password,
        email: 'other@example.com',
      })

      await seedProject(container, client.clientId, { name: 'My project' })
      await seedProject(container, other.clientId, { name: 'Other project' })

      const res = await request(app)
        .get('/clients/projects')
        .set('Authorization', `Bearer ${client.accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject([{ name: 'My project' }])
    })
  })

  describe('GET /clients/me', () => {
    integrationTest('returns the authenticated client profile', async () => {
      const { accessToken, clientId } = await login()

      const res = await request(app)
        .get('/clients/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: clientId,
        name: VALID.name,
        email: VALID.email,
      })
    })
  })

  describe('POST /clients/register', () => {
    integrationTest('requests registration', async () => {
      const res = await register()

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })
      expect(emailToken).toBeTruthy()
    })

    integrationTest('does not reveal that email already exists', async () => {
      await seedClient(container, VALID)

      const res = await register()

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })
      expect(registrationNotice).toBe(true)
      expect(emailToken).toBe('')
    })

    integrationTest('rejects invalid request body', async () => {
      await seedClient(container, VALID)

      const res = await request(app)
        .post('/clients/register')
        .send({ name: '1', email: '2', password: 3 })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
      expect(registrationNotice).toBe(false)
      expect(emailToken).toBe('')
    })
  })

  describe('POST /clients/confirm-register', () => {
    integrationTest('confirms registration and authenticates the client', async () => {
      await register()

      const res = await request(app).post('/clients/confirm-register').send({ token: emailToken })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        clientId: expect.any(String) as string,
        accessToken: expect.any(String) as string,
      })
      expectRefreshCookie(res)
    })

    integrationTest('rejects invalid request body', async () => {
      await register()

      const res = await request(app).post('/clients/confirm-register').send({ token: '12' })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('POST /clients/login', () => {
    integrationTest('logs in client', async () => {
      const client = await seedClient(container, VALID)

      const res = await request(app).post('/clients/login').send({
        email: VALID.email,
        password: VALID.password,
      })

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        clientId: client.clientId,
        accessToken: expect.any(String) as string,
      })
      expectRefreshCookie(res)
    })

    integrationTest('rejects invalid credentials', async () => {
      await seedClient(container, VALID)

      const res = await request(app).post('/clients/login').send({
        email: VALID.email,
        password: 'wrong-password',
      })

      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({
        error: {
          code: 'auth.INVALID_CREDENTIALS',
        },
      })
    })

    integrationTest('rejects invalid request body', async () => {
      await register()

      const res = await request(app).post('/clients/login').send({
        email: '1',
        password: '2',
      })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('PATCH /clients/name', () => {
    integrationTest('changes client name', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .patch('/clients/name')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Name' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ name: 'New Name' })
    })

    integrationTest('rejects invalid request body', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .patch('/clients/name')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '1' })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('PATCH /clients/password', () => {
    integrationTest('changes client password', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .patch('/clients/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: VALID.password,
          newPassword: 'newPassword123',
        })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })

      const loginRes = await request(app).post('/clients/login').send({
        email: VALID.email,
        password: 'newPassword123',
      })

      expect(loginRes.status).toBe(201)
    })

    integrationTest('rejects incorrect current password', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .patch('/clients/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'newPassword123',
        })

      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({
        error: {
          code: 'auth.INVALID_CREDENTIALS',
        },
      })
    })

    integrationTest('rejects invalid request body', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .patch('/clients/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: '1',
          newPassword: '2',
        })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('POST /clients/request-change-email', () => {
    integrationTest('requests email change', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .post('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newEmail: 'new@example.com',
          password: VALID.password,
        })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })
      expect(emailToken).toBeTruthy()
    })

    integrationTest('rejects invalid request body', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .post('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newEmail: '1',
          password: '2',
        })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('POST /clients/confirm-change-email', () => {
    integrationTest('confirms email change', async () => {
      const { accessToken, clientId } = await login()

      await request(app)
        .post('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newEmail: 'new@example.com',
          password: VALID.password,
        })

      const res = await request(app)
        .post('/clients/confirm-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: emailToken })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ newEmail: 'new@example.com' })

      const profile = await request(app)
        .get('/clients/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(profile.body).toMatchObject({
        id: clientId,
        email: 'new@example.com',
      })
    })

    integrationTest('rejects invalid request body', async () => {
      const { accessToken } = await login()

      const res = await request(app)
        .post('/clients/confirm-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '1' })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('POST /clients/request-password-reset', () => {
    integrationTest('requests password reset', async () => {
      await seedClient(container, VALID)

      const res = await request(app)
        .post('/clients/request-password-reset')
        .send({ email: VALID.email })

      expect(res.status).toBe(200)
      expect(res.body).toBe(true)
      expect(resetToken).toBeTruthy()
    })

    integrationTest('rejects invalid request body', async () => {
      await seedClient(container, VALID)

      const res = await request(app).post('/clients/request-password-reset').send({ email: '1' })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('POST /clients/confirm-password-reset', () => {
    integrationTest('confirms password reset and authenticates client', async () => {
      await login()

      await request(app).post('/clients/request-password-reset').send({ email: VALID.email })

      const res = await request(app)
        .post('/clients/confirm-password-reset')
        .send({ token: resetToken })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        accessToken: expect.any(String) as string,
      })
      expectRefreshCookie(res)
    })

    integrationTest('rejects invalid request body', async () => {
      await login()

      await request(app)
        .post('/clients/request-password-reset')
        .send({ email: 'invalid@gmail.com' })

      const res = await request(app)
        .post('/clients/confirm-password-reset')
        .send({ token: resetToken })

      const body = res.body as { error: { message: string } }

      expect(res.status).toBe(400)
      expect(body.error.message).toBe('Validation error')
    })
  })

  describe('POST /clients/logout', () => {
    integrationTest('logs out current session', async () => {
      await seedClient(container, VALID)

      const loginRes = await request(app).post('/clients/login').send(VALID)
      const login = loginRes.body as LoginClientResult

      const refreshToken = refreshCookie(loginRes)

      const res = await request(app)
        .post('/clients/logout')
        .set('Authorization', `Bearer ${login.accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })

      const refreshRes = await request(app)
        .post('/clients/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)

      expect(refreshRes.status).toBe(401)
    })
  })

  describe('POST /clients/logout-all', () => {
    integrationTest('logs out all sessions', async () => {
      await seedClient(container, VALID)

      const first = await request(app).post('/clients/login').send(VALID)
      const firstLogin = first.body as LoginClientResult
      const second = await request(app).post('/clients/login').send(VALID)

      const firstRefresh = refreshCookie(first)
      const secondRefresh = refreshCookie(second)

      const res = await request(app)
        .post('/clients/logout-all')
        .set('Authorization', `Bearer ${firstLogin.accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })

      for (const token of [firstRefresh, secondRefresh]) {
        const refreshRes = await request(app)
          .post('/clients/refresh')
          .set('Cookie', `refresh_token=${token}`)

        expect(refreshRes.status).toBe(401)
      }
    })
  })

  describe('GET /clients/sessions', () => {
    integrationTest('returns active sessions and marks the current one', async () => {
      await seedClient(container, VALID)

      const first = await request(app).post('/clients/login').send(VALID)
      await request(app).post('/clients/login').send(VALID)

      const firstLogin = first.body as LoginClientResult

      const res = await request(app)
        .get('/clients/sessions')
        .set('Authorization', `Bearer ${firstLogin.accessToken}`)

      expect(res.status).toBe(200)

      const sessions = res.body as Session[]

      expect(sessions).toHaveLength(3)

      expect(sessions.filter((session) => session.isCurrent)).toHaveLength(1)
    })
  })

  describe('DELETE /clients/sessions/:sessionId', () => {
    integrationTest('revokes another session', async () => {
      await seedClient(container, VALID)

      const first = await request(app).post('/clients/login').send(VALID)
      await request(app).post('/clients/login').send(VALID)

      const firstLogin = first.body as LoginClientResult

      const sessionsRes = await request(app)
        .get('/clients/sessions')
        .set('Authorization', `Bearer ${firstLogin.accessToken}`)

      const sessions = sessionsRes.body as Session[]
      const otherSession = getOtherSession(sessions)

      const res = await request(app)
        .delete(`/clients/sessions/${otherSession.id}`)
        .set('Authorization', `Bearer ${firstLogin.accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })

      const updatedSessions = await request(app)
        .get('/clients/sessions')
        .set('Authorization', `Bearer ${firstLogin.accessToken}`)

      expect(updatedSessions.body).toHaveLength(2)
    })

    integrationTest('rejects revoking the current session', async () => {
      const { accessToken } = await login()

      const sessionsRes = await request(app)
        .get('/clients/sessions')
        .set('Authorization', `Bearer ${accessToken}`)

      const sessions = sessionsRes.body as Session[]
      const currentSession = getCurrentSession(sessions)

      const res = await request(app)
        .delete(`/clients/sessions/${currentSession.id}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({
        error: {
          code: 'validation.INVALID_INPUT',
        },
      })
    })
  })

  describe('POST /clients/refresh', () => {
    integrationTest('rotates refresh token and returns a new access token', async () => {
      await seedClient(container, VALID)

      const loginRes = await request(app).post('/clients/login').send(VALID)

      const refreshToken = refreshCookie(loginRes)

      const res = await request(app)
        .post('/clients/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        accessToken: expect.any(String) as string,
      })
      expectRefreshCookie(res)

      const newRefreshToken = refreshCookie(res)

      expect(newRefreshToken).not.toBe(refreshToken)
    })
  })
})
