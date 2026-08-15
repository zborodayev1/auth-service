import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { getTestApp, getHttpTestContainer } from '@tests/helpers/httpContainer'
import { truncateAll } from '@tests/helpers/db'
import { RegisterClientHandler } from '@app/commands/client/RegisterClient/RegisterClientHandler'
import { RegisterClientCommand } from '@app/commands/client/RegisterClient/RegisterClientCommand'
import { CreateProjectHandler } from '@app/commands/project/CreateProject/CreateProjectHandler'
import { CreateProjectCommand } from '@app/commands/project/CreateProject/CreateProjectCommand'
import { RotateApiKeyHandler } from '@app/commands/project/RotateApiKey/RotateApiKeyHandler'
import { RotateApiKeyCommand } from '@app/commands/project/RotateApiKey/RotateApiKeyCommand'

// NOTE: Routes requiring both apiKey + userJWT (GET /me, PATCH /me/email, etc.) cannot
// be tested via HTTP currently because UserAuthMiddleware and ApiKeyAuthMiddleware both
// read from the same `Authorization` header. A single request cannot carry both tokens
// simultaneously. This is a known design gap — userJWT should be sent in a separate header.
// Those routes are tested at the handler level via integration tests.

const app = getTestApp()
const container = getHttpTestContainer()

const CLIENT = { name: 'Test Owner', email: 'owner@example.com', password: 'password123' }
const USER = { email: 'user@example.com', password: 'userpassword123' }

async function setupProject(): Promise<{ clientId: string; projectId: string; apiKey: string }> {
  const { clientId } = await container
    .get(RegisterClientHandler)
    .execute(new RegisterClientCommand(CLIENT.name, CLIENT.email, CLIENT.password, null, null, null))

  const { projectId, apiKey } = await container
    .get(CreateProjectHandler)
    .execute(new CreateProjectCommand('Test Project', clientId))

  return { clientId, projectId, apiKey }
}

describe('User HTTP routes', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  describe('POST /projects/:id/users/register', () => {
    it('returns 201 with valid apiKey', async () => {
      const { projectId, apiKey } = await setupProject()

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })
      const body = res.body as { accessToken?: string; userId?: string }

      expect(res.status).toBe(201)
      expect(typeof body.accessToken).toBe('string')
      expect(typeof body.userId).toBe('string')
    })

    it('returns 401 with missing Authorization header', async () => {
      const { projectId } = await setupProject()

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      expect(res.status).toBe(401)
    })

    it('returns 401 with invalid apiKey', async () => {
      const { projectId } = await setupProject()

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', 'Bearer definitely-not-a-valid-key')
        .send({ email: USER.email, password: USER.password, fields: {} })

      expect(res.status).toBe(401)
    })

    it('returns 401 with revoked apiKey', async () => {
      const { projectId, apiKey, clientId } = await setupProject()

      await container.get(RotateApiKeyHandler).execute(new RotateApiKeyCommand(clientId, projectId))

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      expect(res.status).toBe(401)
    })

    it('returns 409 on duplicate email within same project', async () => {
      const { projectId, apiKey } = await setupProject()

      await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      expect(res.status).toBe(409)
    })

    it('returns 400 on missing required fields', async () => {
      const { projectId, apiKey } = await setupProject()

      const res = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /projects/:id/users/login', () => {
    it('returns 200 with accessToken and sets refresh_token cookie', async () => {
      const { projectId, apiKey } = await setupProject()
      await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      const res = await request(app)
        .post(`/projects/${projectId}/users/login`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password })
      const body = res.body as { accessToken?: string }

      expect(res.status).toBe(200)
      expect(typeof body.accessToken).toBe('string')

      const cookies = (res.headers['set-cookie'] ?? []) as string[]
      expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true)
    })

    it('returns 401 on wrong password', async () => {
      const { projectId, apiKey } = await setupProject()
      await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      const res = await request(app)
        .post(`/projects/${projectId}/users/login`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('returns 401 with missing Authorization header', async () => {
      const res = await request(app)
        .post(`/projects/00000000-0000-0000-0000-000000000000/users/login`)
        .send({ email: USER.email, password: USER.password })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /projects/:id/users/refresh', () => {
    it('returns 200 with new accessToken on valid cookie', async () => {
      const { projectId, apiKey } = await setupProject()

      const registerRes = await request(app)
        .post(`/projects/${projectId}/users/register`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: USER.email, password: USER.password, fields: {} })

      const cookies = (registerRes.headers['set-cookie'] ?? []) as string[]

      const res = await request(app)
        .post(`/projects/${projectId}/users/refresh`)
        .set('Authorization', `Bearer ${apiKey}`)
        .set('Cookie', cookies)
      const body = res.body as { accessToken?: string }

      expect(res.status).toBe(200)
      expect(typeof body.accessToken).toBe('string')
    })

    it('returns 400 when refresh cookie is missing', async () => {
      const { projectId, apiKey } = await setupProject()

      const res = await request(app)
        .post(`/projects/${projectId}/users/refresh`)
        .set('Authorization', `Bearer ${apiKey}`)

      expect(res.status).toBe(400)
    })
  })
})
