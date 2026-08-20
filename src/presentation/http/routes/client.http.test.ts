import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'crypto'
import request from 'supertest'
import { getTestApp, getHttpTestContainer } from '@tests/helpers/httpContainer'
import { useTransactionIsolation } from '@tests/helpers/db'
import { IEmailService } from '@ports/IEmailService'
import type { IEmailService as IEmailServiceType } from '@ports/IEmailService'

const app = getTestApp()
const container = getHttpTestContainer()
const emailSvc = container.get<IEmailServiceType>(IEmailService)

const VALID = {
  name: 'Test Client',
  email: 'test@example.com',
  password: 'password123',
}

let capturedCode = 0
vi.spyOn(emailSvc, 'sendPasswordResetEmail').mockImplementation(async (_to, code) => {
  capturedCode = code
})
vi.spyOn(emailSvc, 'sendEmailVerificationEmail').mockImplementation(async (_to, code) => {
  capturedCode = code
})

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
  useTransactionIsolation(container)

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
      const res = await request(app).post('/clients/register').send({ email: VALID.email })

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

      const res = await request(app).post('/clients/refresh').set('Cookie', cookies)
      const body = res.body as { accessToken?: string }

      expect(res.status).toBe(200)
      expect(typeof body.accessToken).toBe('string')
    })

    it('returns 400 when refresh cookie is missing', async () => {
      const res = await request(app).post('/clients/refresh')

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /clients/request-change-email', () => {
    it('returns 200 and returns requestId', async () => {
      const { accessToken } = await registerAndLogin()

      const res = await request(app)
        .patch('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password })
      const body = res.body as { requestId?: string }

      expect(res.status).toBe(200)
      expect(typeof body.requestId).toBe('string')
    })

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .patch('/clients/request-change-email')
        .send({ newEmail: 'new@example.com', password: VALID.password })

      expect(res.status).toBe(401)
    })

    it('returns 401 for wrong password', async () => {
      const { accessToken } = await registerAndLogin()

      const res = await request(app)
        .patch('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('returns 409 when new email already taken', async () => {
      const { accessToken } = await registerAndLogin()
      await request(app)
        .post('/clients/register')
        .send({ name: 'Other Client', email: 'new@example.com', password: VALID.password })

      const res = await request(app)
        .patch('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password })

      expect(res.status).toBe(409)
    })

    it('returns 400 on missing fields', async () => {
      const { accessToken } = await registerAndLogin()

      const res = await request(app)
        .patch('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com' })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /clients/confirm-change-email', () => {
    it('returns 200 with valid code', async () => {
      const { accessToken } = await registerAndLogin()

      const requestRes = await request(app)
        .patch('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password })
      const { requestId } = requestRes.body as { requestId: string }
      const code = capturedCode

      const res = await request(app)
        .patch('/clients/confirm-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password, code, requestId })

      expect(res.status).toBe(200)
    })

    it('returns 401 for wrong code', async () => {
      const { accessToken } = await registerAndLogin()

      const requestRes = await request(app)
        .patch('/clients/request-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password })
      const { requestId } = requestRes.body as { requestId: string }

      const res = await request(app)
        .patch('/clients/confirm-change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'new@example.com', password: VALID.password, code: 99999999, requestId })

      expect(res.status).toBe(401)
    })

    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).patch('/clients/confirm-change-email').send({
        newEmail: 'new@example.com',
        password: VALID.password,
        code: 12345678,
        requestId: '00000000-0000-0000-0000-000000000000',
      })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /clients/request-password-reset', () => {
    it('returns 200 for existing email', async () => {
      await registerAndLogin()

      const res = await request(app)
        .post('/clients/request-password-reset')
        .send({ requestId: randomUUID(), email: VALID.email })

      expect(res.status).toBe(200)
    })

    it('returns 200 for non-existent email (no enumeration)', async () => {
      const res = await request(app)
        .post('/clients/request-password-reset')
        .send({ requestId: randomUUID(), email: 'nobody@example.com' })

      expect(res.status).toBe(200)
    })

    it('returns 400 on missing email', async () => {
      const res = await request(app)
        .post('/clients/request-password-reset')
        .send({ requestId: randomUUID() })

      expect(res.status).toBe(400)
    })

    it('returns 400 on missing requestId', async () => {
      const res = await request(app)
        .post('/clients/request-password-reset')
        .send({ email: VALID.email })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /clients/confirm-password-reset', () => {
    it('returns 200 with valid code', async () => {
      await registerAndLogin()
      const requestId = randomUUID()

      await request(app)
        .post('/clients/request-password-reset')
        .send({ requestId, email: VALID.email })
      const code = capturedCode

      const res = await request(app)
        .post('/clients/confirm-password-reset')
        .send({ requestId, code, newPassword: 'newpassword456' })

      expect(res.status).toBe(200)
    })

    it('new password works for login after reset', async () => {
      await registerAndLogin()
      const requestId = randomUUID()

      await request(app)
        .post('/clients/request-password-reset')
        .send({ requestId, email: VALID.email })
      const code = capturedCode

      await request(app)
        .post('/clients/confirm-password-reset')
        .send({ requestId, code, newPassword: 'newpassword456' })

      const loginRes = await request(app)
        .post('/clients/login')
        .send({ email: VALID.email, password: 'newpassword456' })

      expect(loginRes.status).toBe(201)
    })

    it('returns 401 for wrong code', async () => {
      await registerAndLogin()
      const requestId = randomUUID()

      await request(app)
        .post('/clients/request-password-reset')
        .send({ requestId, email: VALID.email })

      const res = await request(app)
        .post('/clients/confirm-password-reset')
        .send({ requestId, code: 99999999, newPassword: 'newpassword456' })

      expect(res.status).toBe(401)
    })

    it('returns 401 for non-existent requestId', async () => {
      const res = await request(app)
        .post('/clients/confirm-password-reset')
        .send({ requestId: randomUUID(), code: 12345678, newPassword: 'newpassword456' })

      expect(res.status).toBe(401)
    })

    it('returns 400 on missing required fields', async () => {
      const res = await request(app)
        .post('/clients/confirm-password-reset')
        .send({ requestId: randomUUID(), code: 12345678 })

      expect(res.status).toBe(400)
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
