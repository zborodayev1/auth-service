---
title: Express Server Scaffold
date: 2026-04-12
status: approved
---

# Express Server Scaffold

## Goal

Replace empty DDD folder structure with a standard layered structure and write a working Express scaffold in `src/main.ts` + `src/routes/index.ts`.

## Folder Structure

```
src/
├── main.ts              # app init, middleware, mount router, listen
├── routes/
│   └── index.ts         # central router — mount sub-routers here
├── controllers/         # request handlers (empty, .gitkeep)
├── services/            # business logic (empty, .gitkeep)
├── middleware/          # express middleware (empty, .gitkeep)
└── config/              # env config (empty, .gitkeep)
```

DDD folders to delete: `application/`, `domain/`, `infrastructure/`, `shared/`

## `src/main.ts`

- Load env via `dotenv`
- Create Express app
- Apply middleware: `cors()`, `express.json()`
- Mount central router at `/api`
- Add `GET /health` → `{ status: 'ok' }`
- Start `app.listen` on `PORT` from env (default 3000)

## `src/routes/index.ts`

- Create an Express `Router`
- Placeholder comment: `// router.use('/auth', authRouter)`
- Export router

## What is NOT included

- No auth routes, controllers, or services yet — those are connected later
- No database connection
- No error-handling middleware
