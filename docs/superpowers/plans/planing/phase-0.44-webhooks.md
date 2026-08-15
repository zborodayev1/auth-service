---
title: Phase 0.44 — Webhooks
date: 2026-08-15
status: planning
priority: medium — project owners need to react to user events in their own backend; polling is not viable
---

# Phase 0.44 — Webhooks

Project owners register webhook URLs to receive notifications when domain events occur (user registered, logged in, deleted, etc.). Delivery is async, signed with HMAC-SHA256, retried on failure.

**Prerequisites:** Phase 0.35 (event bus Option B), Phase 0.40 (Redis Streams for async delivery).

---

## 0.44.1 — Schema

```prisma
model Webhook {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @db.Uuid
  project   Project  @relation(fields: [projectId], references: [id])

  url       String   @db.VarChar(512)
  secret    String   @db.Char(64)   // HMAC signing key (stored hashed? no — needed for signing)
  events    String[]                 // ["user.registered", "user.login.success", "user.deleted"]
  enabled   Boolean  @default(true)

  createdAt DateTime @default(now())

  deliveries WebhookDelivery[]

  @@index([projectId])
}

model WebhookDelivery {
  id          String   @id @default(uuid()) @db.Uuid
  webhookId   String   @db.Uuid
  webhook     Webhook  @relation(fields: [webhookId], references: [id])

  eventType   String
  payload     Json
  attempt     Int      @default(1)
  statusCode  Int?
  response    String?  @db.VarChar(1024)
  deliveredAt DateTime?
  failedAt    DateTime?

  createdAt   DateTime @default(now())

  @@index([webhookId])
}
```

---

## 0.44.2 — Webhook events

| Event | Trigger |
|-------|---------|
| `user.registered` | `RegisterUserHandler` success |
| `user.login.success` | `LoginUserHandler` success |
| `user.login.failed` | `LoginUserHandler` wrong password |
| `user.logout` | `LogoutCurrentUserSessionHandler` |
| `user.password_changed` | `ChangeUserPasswordHandler` |
| `user.email_changed` | `ChangeUserEmailHandler` |
| `user.deleted` | `DeleteUserHandler` |
| `user.account_locked` | 0.38 lockout threshold hit |

---

## 0.44.3 — Payload format

```json
{
  "id": "evt_01j...",
  "type": "user.registered",
  "projectId": "uuid",
  "timestamp": "2026-08-15T12:00:00.000Z",
  "data": {
    "userId": "uuid",
    "email": "user@example.com"
  }
}
```

**Signature header:**
```
X-Auth-Signature: sha256=<hmac-sha256(secret, raw-body)>
```

Project owners verify: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`.

---

## 0.44.4 — Async delivery via Redis Streams

```ts
// Publisher (in event handler, after domain event):
await redis.xadd('webhook-deliveries', '*',
  'webhookId', webhook.id,
  'eventType', 'user.registered',
  'payload', JSON.stringify(payload),
)

// Consumer (separate worker or same process):
const entries = await redis.xreadgroup(
  'GROUP', 'webhook-workers', 'worker-1',
  'COUNT', '10', 'BLOCK', '5000',
  'STREAMS', 'webhook-deliveries', '>',
)
```

Consumer group ensures at-least-once delivery. Multiple worker instances can process in parallel without duplicate delivery.

---

## 0.44.5 — Retry policy

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failures: mark delivery as `failed`, store last error response. Do not retry further. Dashboard shows failed deliveries — project owner can re-trigger manually.

Timeout per delivery attempt: 10 seconds.

---

## 0.44.6 — CRUD endpoints

```
POST   /projects/:id/webhooks          — create (apiKey)
GET    /projects/:id/webhooks          — list (apiKey)
DELETE /projects/:id/webhooks/:wId     — delete (apiKey)
PATCH  /projects/:id/webhooks/:wId     — update url/events/enabled (apiKey)
GET    /projects/:id/webhooks/:wId/deliveries  — delivery history (apiKey)
POST   /projects/:id/webhooks/:wId/test        — send test event (apiKey)
```

---

## Priority Order

1. Schema + `Webhook` aggregate + CRUD commands
2. CRUD HTTP endpoints
3. Redis Streams consumer setup
4. `WebhookDeliveryWorker` with retry policy
5. HMAC signing
6. `/test` endpoint for integration testing
