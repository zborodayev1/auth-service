---
title: Multi-Tenant User Schema & JWT Split
date: 2026-07-18
status: approved
---

# Multi-Tenant User Schema & JWT Split

## Goal

Expand auth-service from a single-level auth system into a two-level multi-tenant platform:
- **Level 1 (Internal):** Clients manage their account and projects via internal JWT
- **Level 2 (External):** Each Project has its own Users with dynamic custom fields, authenticated via per-project JWT

---

## JWT Architecture

### Internal JWT (Client)
```
{ sub: clientId, type: "client", iat, exp }
signed with JWT_SECRET (env var)
```
Used for: Client account management, project management, schema management, admin user field access.

### External JWT (User)
```
{ sub: userId, projectId, type: "user", iat, exp }
signed with Project.jwtSecret (per-project, generated on project creation)
```
Used for: User auth within a Project. Each project has an isolated secret — compromise of one project does not affect others.

### Middleware Split
- `AuthMiddleware` (existing) — validates `type: "client"`, uses `JWT_SECRET`
- `UserAuthMiddleware` (new) — extracts `projectId` from token, loads `Project.jwtSecret` from DB, verifies signature, checks `type: "user"`

---

## New Domain Entities

### User
End-user of a Project.
```
id: UUID
projectId: UUID (FK → Project)
email: string (unique per project)
passwordHash: string
createdAt: DateTime

unique: (projectId, email)
```

### ProjectField
Definition of a custom field for Project Users.
```
id: UUID
projectId: UUID (FK → Project)
name: string
type: "string" | "number" | "boolean" | "date" | "enum"
required: boolean
defaultValue?: string (serialized)
enumValues: string[] (only for type=enum)
createdAt: DateTime

unique: (projectId, name)
```

### UserFieldValue
Stores the value of a ProjectField for a specific User. All values serialized to string, parsed on read according to field type.
```
id: UUID
userId: UUID (FK → User)
fieldId: UUID (FK → ProjectField)
value: string
updatedAt: DateTime

unique: (userId, fieldId)
```

### UserSession + UserRefreshToken
Mirror of existing `Session` + `RefreshToken`, but scoped to `userId` instead of `clientId`. Same rotation/revocation logic.

### Project changes
```diff
+ jwtSecret: string   // crypto.randomBytes(32).toString('hex'), generated on CreateProject
```

---

## Dynamic Schema System

### SchemaBuilderService
Builds a Zod schema at runtime from `ProjectField[]`:

```
string  → z.string()
number  → z.coerce.number()
boolean → z.coerce.boolean()
date    → z.coerce.date()
enum    → z.enum([...enumValues])

required=false  → .optional()
defaultValue    → .default(parsedValue)
```

Result: `ZodObject` used in `RegisterUserHandler` to validate `fields` from request body.

Future optimization (Phase 2): cache generated schemas per `projectId` in `Map<string, ZodObject>`, invalidate on any ProjectField mutation.

### Field Deletion Constraint
- If no `UserFieldValue` records exist for this field → delete allowed
- If any `UserFieldValue` exists for this field → **reject deletion** (return 409 Conflict)
- Rationale: prevent silent data inconsistency. Configurable via SDK in the future (`strict: true`)

### Field Update Constraint
`UpdateProjectField` may change: `name`, `required`, `defaultValue`, `enumValues`.
`type` is **immutable** after creation — changing type would invalidate all existing serialized values.

### Schema Field CRUD (Internal JWT only)
```
POST   /projects/:projectId/schema/fields
GET    /projects/:projectId/schema/fields
PATCH  /projects/:projectId/schema/fields/:fieldId
DELETE /projects/:projectId/schema/fields/:fieldId
```

---

## User Auth Flow

### Register
```
POST /projects/:projectId/users/register
Body: { email, password, fields: { [name]: value } }
```
1. Load all `ProjectField` for project
2. Build Zod schema via `SchemaBuilderService`
3. Validate `fields` against schema
4. Hash password
5. Create `User` + `UserFieldValues` in single Prisma transaction
6. Create `UserSession` + `UserRefreshToken`
7. Return external JWT + refresh token in httpOnly cookie

### Login
```
POST /projects/:projectId/users/login
Body: { email, password }
```
1. Find User by (projectId, email)
2. Verify password hash
3. Create UserSession + UserRefreshToken
4. Return external JWT + refresh token in httpOnly cookie

### Refresh / Logout / Logout-All
Same logic as Client equivalents, scoped to UserSession/UserRefreshToken.

---

## HTTP API

### Internal (Client, `type: "client"` JWT)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /clients/register | — | Register client |
| POST | /clients/login | — | Login client |
| POST | /clients/refresh | — | Refresh access token |
| POST | /clients/logout | ✓ | Logout current session |
| POST | /clients/logout-all | ✓ | Logout all sessions |
| PATCH | /clients/me/email | ✓ | Change email |
| PATCH | /clients/me/password | ✓ | Change password |
| POST | /projects | ✓ | Create project |
| GET | /projects | ✓ | List own projects |
| POST | /projects/:id/api-keys | ✓ | Create API key |
| POST | /projects/:id/schema/fields | ✓ | Define custom field |
| GET | /projects/:id/schema/fields | ✓ | List field definitions |
| PATCH | /projects/:id/schema/fields/:fid | ✓ | Update field definition |
| DELETE | /projects/:id/schema/fields/:fid | ✓ | Delete field definition |
| GET | /projects/:id/users/:uid/fields | ✓ | Get user fields (admin) |
| PATCH | /projects/:id/users/:uid/fields/:name | ✓ | Update user field (admin) |

### External (User, `type: "user"` JWT, per-project secret)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /projects/:id/users/register | — | Register user (validates dynamic fields) |
| POST | /projects/:id/users/login | — | Login user |
| POST | /projects/:id/users/refresh | — | Refresh user token |
| POST | /projects/:id/users/logout | ✓ | Logout current session |
| POST | /projects/:id/users/logout-all | ✓ | Logout all sessions |
| GET | /projects/:id/users/me/fields | ✓ | Get own field values |
| GET | /projects/:id/users/me/fields/:name | ✓ | Get one field value |
| PATCH | /projects/:id/users/me/fields/:name | ✓ | Update one field value |

---

## New Commands

**Client domain:**
- `GetClientProjectsQuery` (first query-side addition)

**Project domain:**
- `AddProjectField` / `UpdateProjectField` / `DeleteProjectField`
- `GetProjectFields`

**User domain (new aggregate):**
- `RegisterUser`
- `LoginUser`
- `LogoutUserSession`
- `LogoutAllUserSessions`
- `RefreshUserAccessToken`
- `UpdateUserField`

---

## Prisma Schema Additions

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  projectId    String   @db.Uuid
  project      Project  @relation(fields: [projectId], references: [id])
  email        String   @db.VarChar(254)
  passwordHash String   @db.Char(60)
  sessions     UserSession[]
  fieldValues  UserFieldValue[]
  createdAt    DateTime @default(now())

  @@unique([projectId, email])
}

model ProjectField {
  id           String   @id @default(uuid()) @db.Uuid
  projectId    String   @db.Uuid
  project      Project  @relation(fields: [projectId], references: [id])
  name         String   @db.VarChar(64)
  type         FieldType
  required     Boolean  @default(false)
  defaultValue String?
  enumValues   String[]
  fieldValues  UserFieldValue[]
  createdAt    DateTime @default(now())

  @@unique([projectId, name])
}

model UserFieldValue {
  id        String       @id @default(uuid()) @db.Uuid
  userId    String       @db.Uuid
  user      User         @relation(fields: [userId], references: [id])
  fieldId   String       @db.Uuid
  field     ProjectField @relation(fields: [fieldId], references: [id])
  value     String
  updatedAt DateTime     @updatedAt

  @@unique([userId, fieldId])
}

model UserSession {
  id            String    @id @default(uuid()) @db.Uuid
  userId        String    @db.Uuid
  user          User      @relation(fields: [userId], references: [id])
  refreshTokens UserRefreshToken[]
  expiresAt     DateTime
  revokedAt     DateTime?
  createdAt     DateTime  @default(now())
  lastUsedAt    DateTime  @default(now())
  userAgent     String?
  ipAddress     String?

  @@index([userId])
}

model UserRefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  sessionId String    @db.Uuid
  session   UserSession @relation(fields: [sessionId], references: [id])
  hash      String    @unique @db.Char(64)
  usedAt    DateTime?
  revokedAt DateTime?
  expiresAt DateTime
  createdAt DateTime  @default(now())

  @@index([sessionId])
}

enum FieldType {
  string
  number
  boolean
  date
  enum
}
```

`Project` gets `+ jwtSecret String` and `+ fields ProjectField[]` and `+ users User[]`.

---

## Implementation Order

1. Prisma schema migrations (new models + Project.jwtSecret)
2. `Project.jwtSecret` generation in `CreateProjectHandler`
3. New domain aggregates: `User`, `ProjectField`, `UserFieldValue`, `UserSession`, `UserRefreshToken`
4. `SchemaBuilderService`
5. User commands (RegisterUser, LoginUser, Logout, Refresh, UpdateUserField)
6. ProjectField commands (Add, Update, Delete, Get)
7. `UserAuthMiddleware`
8. HTTP routes + controllers + validators
9. Wire everything in `bootstrap.ts`
