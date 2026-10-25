import type { LoginClientResult } from '@app/commands/client/LoginClient/LoginClientHandler'
import type { AddProjectFieldResult } from '@app/commands/project/AddProjectField/AddProjectFieldHandler'
import type { CreateProjectResult } from '@app/commands/project/CreateProject/CreateProjectHandler'
import type { RenameApiKeyResult } from '@app/commands/project/RenameApiKey/RenameApiKeyHandler'
import { seedClient } from '@tests/fixtures/client'
import { seedProject } from '@tests/fixtures/project'
import { seedProjectField } from '@tests/fixtures/seedProjectField'
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
async function login(data = VALID_CLIENT): Promise<LoginClientResult> {
  await seedClient(container, data)

  const res = await request(app).post('/clients/login').send(data)

  expect(res.status).toBe(201)

  return res.body as LoginClientResult
}

describe('Project HTTP routes', () => {
  describe('POST /projects', () => {
    integrationTest('creates a project', async () => {
      const { accessToken } = await login()

      const createRes = await request(app)
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Project' })

      expect(createRes.status).toBe(201)

      const { projectId, apiKey } = createRes.body as CreateProjectResult

      expect(projectId).toEqual(expect.any(String))
      expect(apiKey).toEqual(expect.any(String))
    })
  })

  describe('GET /projects/:projectId', () => {
    integrationTest('gets a project', async () => {
      const { accessToken, clientId } = await login()

      const { projectId } = await seedProject(container, clientId)

      const res = await request(app)
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: projectId,
        name: 'Test Project',
        fieldCount: 0,
        apiKey: {
          name: 'Test Project',
          revoked: false,
        },
      })
    })
  })

  describe('GET /projects/:projectId/fields', () => {
    integrationTest('gets project fields', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      await seedProjectField(container, projectId, clientId, {
        name: 'Age',
        type: 'number',
        required: false,
      })

      const res = await request(app)
        .get(`/projects/${projectId}/fields`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)

      const body = res.body as {
        fields: {
          name: string
          type: string
          required: boolean
        }[]
      }

      expect(body.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Age',
            type: 'number',
            required: false,
          }),
        ]),
      )
    })
  })
  describe('GET /projects/:projectId/key', () => {
    integrationTest('gets project api key', async () => {
      const { accessToken, clientId } = await login()

      const { projectId } = await seedProject(container, clientId)

      const res = await request(app)
        .get(`/projects/${projectId}/key`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: expect.any(String) as string,
        name: 'Test Project',
        revoked: false,
        createdAt: expect.any(String) as string,
      })
    })
  })

  describe('GET /projects/:projectId/users', () => {
    integrationTest('gets project users', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)
      const user = await seedUser(container, projectId)

      const res = await request(app)
        .get(`/projects/${projectId}/users`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)

      const body = res.body as {
        users: { id: string; projectId: string }[]
        total: number
        limit: number
        offset: number
      }

      const expectedUser = {
        id: user.userId,
        projectId: projectId,
      }

      expect(body).toMatchObject({
        users: expect.arrayContaining([
          expect.objectContaining(expectedUser) as typeof expectedUser,
        ]) as unknown as typeof body.users,
        total: 1,
        limit: 20,
        offset: 0,
      })
    })
  })
  describe('GET /projects/:projectId/users/:userId', () => {
    integrationTest('gets project user', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const user = await seedUser(container, projectId)

      const res = await request(app)
        .get(`/projects/${projectId}/users/${user.userId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        id: user.userId,
        projectId,
        email: expect.any(String) as string,
        fields: expect.any(Array) as unknown[],
      })
    })
  })

  describe('POST /projects/:projectId/fields', () => {
    integrationTest('adds a project field', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const res = await request(app)
        .post(`/projects/${projectId}/fields`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Age',
          type: 'number',
          required: false,
          enumValues: [],
        })

      expect(res.status).toBe(201)
      const body = res.body as AddProjectFieldResult

      expect(body).toMatchObject({
        fieldId: expect.any(String) as string,
      })

      const fieldsRes = await request(app)
        .get(`/projects/${projectId}/fields`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(fieldsRes.status).toBe(200)

      const fieldsBody = fieldsRes.body as {
        fields: {
          _id: string
          name: string
          type: string
          required: boolean
        }[]
      }

      expect(fieldsBody.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: body.fieldId,
            name: 'Age',
            type: 'number',
            required: false,
          }),
        ]),
      )
    })
  })

  describe('POST /projects/:projectId/fields/:fieldId/recover', () => {
    integrationTest('recovers a deleted project field', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const field = await seedProjectField(container, projectId, clientId, {
        name: 'Age',
        type: 'number',
        required: false,
      })

      const deleteRes = await request(app)
        .delete(`/projects/${projectId}/fields/${field.fieldId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(deleteRes.status).toBe(200)

      const res = await request(app)
        .post(`/projects/${projectId}/fields/${field.fieldId}/recover`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        fieldId: field.fieldId,
      })
    })
  })
  describe('POST /projects/:projectId/key/rotate', () => {
    integrationTest('rotates project api key', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId, { name: 'Test Project' })

      const res = await request(app)
        .post(`/projects/${projectId}/key/rotate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Project' })

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        rawKey: expect.any(String) as string,
      })
    })
  })

  describe('PATCH /projects/:projectId', () => {
    integrationTest('renames a project', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const res = await request(app)
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Renamed Project' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        projectId,
        name: 'Renamed Project',
      })
    })
  })
  describe('PATCH /projects/:projectId/fields/:fieldId', () => {
    integrationTest('updates a project field', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const field = await seedProjectField(container, projectId, clientId, {
        name: 'Age',
        type: 'number',
        required: false,
      })

      const res = await request(app)
        .patch(`/projects/${projectId}/fields/${field.fieldId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'User Age',
          required: true,
          defaultValue: '18',
          enumValues: ['a', 'b'],
        })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        fieldId: field.fieldId,
      })

      const fieldsRes = await request(app)
        .get(`/projects/${projectId}/fields`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(fieldsRes.status).toBe(200)

      const fieldsBody = fieldsRes.body as {
        fields: {
          _id: string
          name: string
          type: string
        }[]
      }

      expect(fieldsBody.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: field.fieldId,
            name: 'User Age',
            required: true,
          }),
        ]),
      )
    })
  })

  describe('PATCH /projects/:projectId/key', () => {
    integrationTest('renames project api key', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const res = await request(app)
        .patch(`/projects/${projectId}/key`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Production API Key' })

      expect(res.status).toBe(200)

      const body = res.body as RenameApiKeyResult
      expect(body).toEqual({
        id: expect.any(String) as string,
        name: 'Production API Key',
      })
    })
  })
  describe('PATCH /projects/:projectId/users/:userId/fields/:fieldId', () => {
    integrationTest('updates user field value', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const field = await seedProjectField(container, projectId, clientId, {
        name: 'Age',
        type: 'number',
        required: false,
      })

      const user = await seedUser(container, projectId)

      const res = await request(app)
        .patch(`/projects/${projectId}/users/${user.userId}/fields/${field.fieldId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: '25' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        fieldId: field.fieldId,
        value: '25',
      })
    })
  })
  describe('DELETE /projects/:projectId', () => {
    integrationTest('deletes a project', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const res = await request(app)
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
      })
    })
  })

  describe('DELETE /projects/:projectId/fields/:fieldId', () => {
    integrationTest('deletes a project field', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const field = await seedProjectField(container, projectId, clientId, {
        name: 'Age',
        type: 'number',
        required: false,
      })

      const res = await request(app)
        .delete(`/projects/${projectId}/fields/${field.fieldId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
      })
    })
  })

  describe('DELETE /projects/:projectId/users/:userId', () => {
    integrationTest('deletes a project user', async () => {
      const { accessToken, clientId } = await login()
      const { projectId } = await seedProject(container, clientId)

      const user = await seedUser(container, projectId)

      const res = await request(app)
        .delete(`/projects/${projectId}/users/${user.userId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        success: true,
      })
    })
  })
})
