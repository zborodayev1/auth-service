import type { LoginClientResult } from '@app/commands/client/LoginClient/LoginClientHandler'
import type { GetUserFieldsResult } from '@app/queries/user/GetUserFields/GetUserFieldsHandler'
import type { GetUserProfileResult } from '@app/queries/user/GetUserProfile/GetUserProfileHandler'
import type { UserSessionDto } from '@app/queries/user/GetUserSessions/GetUserSessionsHandler'
import { seedClient } from '@tests/fixtures/client'
import { seedProject } from '@tests/fixtures/project'
import { seedProjectField } from '@tests/fixtures/seedProjectField'
import { seedUserField } from '@tests/fixtures/seedUserField'
import { seedUser } from '@tests/fixtures/user'
import { integrationTest } from '@tests/helpers/integrationTest'
import { environment } from '@tests/setup'
import request from 'supertest'
import { describe, expect } from 'vitest'

const app = environment.app
const container = environment.container.container

const VALID_CLIENT = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

const VALID_USER = {
  email: 'user@example.com',
  password: 'password123',
}

const VALID_FIELD = {
  name: 'bio',
  type: 'string' as const,
  required: false,
}

const USER_FIELD_VALUE = 'John'

async function login(data = VALID_CLIENT): Promise<LoginClientResult> {
  await seedClient(container, data)

  const res = await request(app).post('/clients/login').send(data)

  expect(res.status).toBe(201)

  return res.body as LoginClientResult
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

function expectRefreshCookieCleared(res: request.Response): void {
  const rawCookies: unknown = res.headers['set-cookie']

  const cookies: string[] = Array.isArray(rawCookies)
    ? rawCookies.filter((cookie): cookie is string => typeof cookie === 'string')
    : []

  const cookie = cookies.find((cookie) => cookie.startsWith('refresh_token='))

  expect(cookie).toBeTruthy()
  expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
}

describe('User HTTP routes', () => {
  describe('GET /projects/:projectId/users/me', () => {
    integrationTest('gets current user profile', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { userId, accessToken } = await seedUser(container, projectId)

      const res = await request(app)
        .get('/projects/:projectId/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      const body = res.body as GetUserProfileResult

      expect(body).toMatchObject({
        userId: userId,
        projectId,
        createdAt: expect.any(String) as string,
        fields: expect.any(Array) as unknown[],
      })
    })
  })

  describe('GET /projects/:projectId/users/me/fields', () => {
    integrationTest('gets current user fields', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken, userId } = await seedUser(container, projectId)

      const { fieldId } = await seedProjectField(container, projectId, clientId)

      await seedUserField(container, userId, projectId, fieldId, USER_FIELD_VALUE)

      const res = await request(app)
        .get(`/projects/${projectId}/users/me/fields`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      const body = res.body as GetUserFieldsResult

      const expectedField = { id: fieldId, value: USER_FIELD_VALUE }

      expect(body).toMatchObject({
        fields: expect.arrayContaining([
          expect.objectContaining(expectedField) as typeof expectedField,
        ]) as unknown as typeof body.fields,
      })
    })
  })
  describe('GET /projects/:projectId/users/me/fields/:fieldId', () => {
    integrationTest('gets current user field', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { userId, accessToken } = await seedUser(container, projectId)
      const { fieldId } = await seedProjectField(container, projectId, clientId)

      await seedUserField(container, userId, projectId, fieldId, USER_FIELD_VALUE)

      const res = await request(app)
        .get(`/projects/${projectId}/users/me/fields/${fieldId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        field: {
          id: fieldId,
          name: VALID_FIELD.name,
          type: VALID_FIELD.type,
          value: USER_FIELD_VALUE,
          required: VALID_FIELD.required,
          defaultValue: null,
        },
      })
    })
  })

  describe('GET /projects/:projectId/users/me/sessions', () => {
    integrationTest('gets current user sessions', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId)

      const res = await request(app)
        .get(`/projects/${projectId}/users/me/sessions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      const body = res.body as UserSessionDto[]

      expect(body).toHaveLength(1)

      expect(body[0]).toMatchObject({
        id: expect.any(String) as string,
        createdAt: expect.any(String) as string,
        isCurrent: true,
      })
    })
  })

  describe('POST /projects/:projectId/users/register', () => {
    integrationTest('registers a user', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('x-api-key', apiKey)
        .send({
          email: VALID_USER.email,
          password: VALID_USER.password,
          fields: {},
        })

      expect(res.status).toBe(201)

      expect(res.body).toMatchObject({
        userId: expect.any(String) as string,
        accessToken: expect.any(String) as string,
      })

      expectRefreshCookie(res)
    })
  })

  describe('POST /projects/:projectId/users/login', () => {
    integrationTest('logs in user', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)

      await seedUser(container, projectId, {
        email: VALID_USER.email,
        password: VALID_USER.password,
      })

      const res = await request(app)
        .post(`/projects/${projectId}/users/login`)
        .set('x-api-key', apiKey)
        .send({
          email: VALID_USER.email,
          password: VALID_USER.password,
        })

      expect(res.status).toBe(200)

      expect(res.body).toMatchObject({
        userId: expect.any(String) as string,
        accessToken: expect.any(String) as string,
      })

      expectRefreshCookie(res)
    })

    integrationTest('rejects invalid credentials', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)

      await seedUser(container, projectId, {
        email: VALID_USER.email,
        password: VALID_USER.password,
      })

      const res = await request(app)
        .post(`/projects/${projectId}/users/login`)
        .set('x-api-key', apiKey)
        .send({
          email: VALID_USER.email,
          password: 'wrong-password',
        })

      expect(res.status).toBe(401)

      expect(res.body).toMatchObject({
        error: {
          code: 'auth.INVALID_CREDENTIALS',
        },
      })
    })
  })

  describe('POST /projects/:projectId/users/refresh', () => {
    integrationTest('refreshes access token', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { refreshToken } = await seedUser(container, projectId)

      const res = await request(app)
        .post(`/projects/${projectId}/users/refresh`)
        .set('x-api-key', apiKey)
        .set('Cookie', `refresh_token=${refreshToken}`)

      expect(res.status).toBe(200)

      expect(res.body).toMatchObject({
        accessToken: expect.any(String) as string,
      })

      expectRefreshCookie(res)
    })
  })

  describe('POST /projects/:projectId/users/logout', () => {
    integrationTest('logs out current user session', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId)

      const res = await request(app)
        .post(`/projects/${projectId}/users/logout`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        success: true,
      })

      expectRefreshCookieCleared(res)
    })
  })
  describe('POST /projects/:projectId/users/logout-all', () => {
    integrationTest('logs out all user sessions', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId)

      const res = await request(app)
        .post(`/projects/${projectId}/users/logout-all`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        success: true,
      })

      expectRefreshCookieCleared(res)
    })
  })
  describe('PATCH /projects/:projectId/users/me/email', () => {
    integrationTest('changes user email', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId, VALID_USER)

      const res = await request(app)
        .patch(`/projects/${projectId}/users/me/email`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)
        .send({
          newEmail: 'new-user@example.com',
          password: VALID_USER.password,
        })

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        email: 'new-user@example.com',
      })
    })
    integrationTest('rejects incorrect current password', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId, VALID_USER)

      const res = await request(app)
        .patch(`/projects/${projectId}/users/me/email`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)
        .send({
          newEmail: 'new-user@example.com',
          password: 'wrong-password',
        })

      expect(res.status).toBe(401)

      expect(res.body).toMatchObject({
        error: {
          code: 'auth.INVALID_CREDENTIALS',
        },
      })
    })
  })
  describe('PATCH /projects/:projectId/users/me/password', () => {
    integrationTest('changes user password', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId, VALID_USER)

      const res = await request(app)
        .patch(`/projects/${projectId}/users/me/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)
        .send({
          currentPassword: VALID_USER.password,
          newPassword: 'new-password123',
        })

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        success: true,
      })
    })
    integrationTest('rejects incorrect current password', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId, VALID_USER)

      const res = await request(app)
        .patch(`/projects/${projectId}/users/me/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)
        .send({
          currentPassword: 'wrong-password',
          newPassword: 'new-password123',
        })

      expect(res.status).toBe(401)

      expect(res.body).toMatchObject({
        error: {
          code: 'auth.INVALID_CREDENTIALS',
        },
      })
    })
  })

  describe('PATCH /projects/:projectId/users/me/fields/:fieldId', () => {
    integrationTest('sets current user field', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId)
      const { fieldId } = await seedProjectField(container, projectId, clientId)

      const res = await request(app)
        .patch(`/projects/${projectId}/users/me/fields/${fieldId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)
        .send({
          value: 'John',
        })

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        fieldId,
        value: 'John',
      })
    })
  })

  describe('DELETE /projects/:projectId/users/me/sessions/:sessionId', () => {
    integrationTest('revokes another user session', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId, VALID_USER)

      const loginRes = await request(app)
        .post(`/projects/${projectId}/users/login`)
        .set('x-api-key', apiKey)
        .send(VALID_USER)

      expect(loginRes.status).toBe(200)

      const sessionsRes = await request(app)
        .get(`/projects/${projectId}/users/me/sessions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(sessionsRes.status).toBe(200)

      const sessions = sessionsRes.body as UserSessionDto[]
      const sessionToRevoke = sessions.find((session) => !session.isCurrent)

      expect(sessionToRevoke).toBeDefined()

      if (!sessionToRevoke) {
        throw new Error('Expected another user session')
      }

      const res = await request(app)
        .delete(`/projects/${projectId}/users/me/sessions/${sessionToRevoke.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        success: true,
      })
    })
  })

  describe('DELETE /projects/:projectId/users/me', () => {
    integrationTest('deletes current user', async () => {
      const { clientId } = await login()
      const { projectId, apiKey } = await seedProject(container, clientId)
      const { accessToken } = await seedUser(container, projectId, VALID_USER)

      const res = await request(app)
        .delete(`/projects/${projectId}/users/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-api-key', apiKey)
        .send({
          password: VALID_USER.password,
        })

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        success: true,
      })

      expectRefreshCookieCleared(res)
    })
  })
})
