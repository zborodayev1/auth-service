import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { getTestApp, getHttpTestContainer } from '@tests/helpers/httpContainer'
import { truncateAll } from '@tests/helpers/db'

const app = getTestApp()
const container = getHttpTestContainer()

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

async function registerAndLogin(): Promise<{ accessToken: string; cookies: string[] }> {
  await request(app).post('/clients/register').send(VALID)
  const res = await request(app)
    .post('/clients/login')
    .send({ email: VALID.email, password: VALID.password })
  const { accessToken } = res.body as { accessToken: string }
  const cookies = (res.headers['set-cookie'] ?? []) as string[]
  return { accessToken, cookies }
}

describe('Client HTTP routes', () => {
  beforeEach(async () => {
    await truncateAll(container)
  })

  describe('POST /clients/register', () => {
    it('returns 201 with accessToken and clientId on valid body', async () => {
      const res = await request(app).post('/clients/register').send(VALID)
      const body = res.body as { accessToken?: string; clientId?: string }

      expect(res.status).toBe(201)
      expect(typeof body.accessToken).toBe('string')
      expect(typeof body.clientId).toBe('string')
    })

    it('returns 409 on duplicate email', async () => {
      await request(app).post('/clients/register').send(VALID)
      const res = await request(app).post('/clients/register').send(VALID)

      expect(res.status).toBe(409)
    })

    it('returns 400 on missing required fields', async () => {
      const res = await request(app)
        .post('/clients/register')
        .send({ email: VALID.email })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /clients/login', () => {
    it('returns 201 with accessToken and sets refresh_token cookie', async () => {
      await request(app).post('/clients/register').send(VALID)

      const res = await request(app)
        .post('/clients/login')
        .send({ email: VALID.email, password: VALID.password })
      const body = res.body as { accessToken?: string }

      expect(res.status).toBe(201)
      expect(typeof body.accessToken).toBe('string')

      const cookies = (res.headers['set-cookie'] ?? []) as string[]
      expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true)
    })

    it('returns 401 on wrong password', async () => {
      await request(app).post('/clients/register').send(VALID)

      const res = await request(app)
        .post('/clients/login')
        .send({ email: VALID.email, password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/clients/login')
        .send({ email: 'nobody@example.com', password: VALID.password })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /clients/refresh', () => {
    it('returns 200 with new accessToken on valid refresh cookie', async () => {
      const { cookies } = await registerAndLogin()

      const res = await request(app)
        .post('/clients/refresh')
        .set('Cookie', cookies)
      const body = res.body as { accessToken?: string }

      expect(res.status).toBe(200)
      expect(typeof body.accessToken).toBe('string')
    })

    it('returns 400 when refresh cookie is missing', async () => {
      const res = await request(app).post('/clients/refresh')

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /clients/email', () => {
    it('returns 200 on valid JWT and correct body', async () => {
      const { accessToken } = await registerAndLogin()

      const res = await request(app)
        .patch('/clients/email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password })

      expect(res.status).toBe(200)
    })

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .patch('/clients/email')
        .send({ newEmail: 'new@example.com', password: VALID.password })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /clients/logout', () => {
    it('returns 200 and clears refresh_token cookie', async () => {
      const { accessToken, cookies } = await registerAndLogin()

      const res = await request(app)
        .post('/clients/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)

      const setCookie = (res.headers['set-cookie'] ?? []) as string[]
      expect(setCookie.some((c) => c.includes('refresh_token=;'))).toBe(true)
    })

    it('returns 401 without Authorization header', async () => {
      const res = await request(app).post('/clients/logout')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /clients/logout-all', () => {
    it('returns 200 with valid JWT', async () => {
      const { accessToken } = await registerAndLogin()

      const res = await request(app)
        .post('/clients/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
    })
  })

  describe('GET /clients/sessions', () => {
    it('returns 200 with sessions array for valid JWT', async () => {
      const { accessToken } = await registerAndLogin()

      const res = await request(app)
        .get('/clients/sessions')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('returns 401 without Authorization header', async () => {
      const res = await request(app).get('/clients/sessions')

      expect(res.status).toBe(401)
    })
  })
})
