# Express Server Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace empty DDD folder structure with a standard layered structure and write a working Express scaffold.

**Architecture:** `main.ts` initializes the app and mounts a central router from `routes/index.ts`. Empty placeholder directories (`controllers/`, `services/`, `middleware/`, `config/`) are created for future work.

**Tech Stack:** Express 5, TypeScript (NodeNext/ESM), cors, dotenv

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Delete | `src/application/` | DDD — remove |
| Delete | `src/domain/` | DDD — remove |
| Delete | `src/infrastructure/` | DDD — remove |
| Delete | `src/shared/` | DDD — remove |
| Create | `src/main.ts` | App init, middleware, listen |
| Create | `src/routes/index.ts` | Central router |
| Create | `src/controllers/.gitkeep` | Placeholder |
| Create | `src/services/.gitkeep` | Placeholder |
| Create | `src/middleware/.gitkeep` | Placeholder |
| Create | `src/config/.gitkeep` | Placeholder |

---

### Task 1: Remove DDD folder structure

**Files:**
- Delete: `src/application/`
- Delete: `src/domain/`
- Delete: `src/infrastructure/`
- Delete: `src/shared/`

- [ ] **Step 1: Remove the DDD folders**

```bash
rm -rf src/application src/domain src/infrastructure src/shared
```

Expected: no output, exit 0.

- [ ] **Step 2: Verify only `src/main.ts` remains**

```bash
find src -type f | sort
```

Expected output:
```
src/main.ts
```

---

### Task 2: Create placeholder directories

**Files:**
- Create: `src/controllers/.gitkeep`
- Create: `src/services/.gitkeep`
- Create: `src/middleware/.gitkeep`
- Create: `src/config/.gitkeep`

- [ ] **Step 1: Create `.gitkeep` files**

```bash
mkdir -p src/controllers src/services src/middleware src/config
touch src/controllers/.gitkeep src/services/.gitkeep src/middleware/.gitkeep src/config/.gitkeep
```

- [ ] **Step 2: Verify structure**

```bash
find src -not -path 'src/main.ts' | sort
```

Expected output includes:
```
src/config
src/config/.gitkeep
src/controllers
src/controllers/.gitkeep
src/middleware
src/middleware/.gitkeep
src/services
src/services/.gitkeep
```

---

### Task 3: Write `src/routes/index.ts`

**Files:**
- Create: `src/routes/index.ts`

- [ ] **Step 1: Create the routes directory and file**

```typescript
// src/routes/index.ts
import { Router } from 'express'

const router = Router()

// router.use('/auth', authRouter)

export default router
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

---

### Task 4: Write `src/main.ts`

**Files:**
- Modify: `src/main.ts`

Note: project uses `"type": "module"` with `moduleResolution: NodeNext` — all local imports require `.js` extension. `process.env` access uses bracket notation due to `noPropertyAccessFromIndexSignature`.

- [ ] **Step 1: Write the file**

```typescript
// src/main.ts
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import router from './routes/index.js'

const app = express()
const PORT = process.env['PORT'] ?? 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', router)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Start the dev server and verify**

```bash
pnpm dev
```

Expected: `Server running on port 3000`

- [ ] **Step 4: Test health endpoint**

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Stop dev server (Ctrl+C)**

---

### Task 5: Commit

- [ ] **Step 1: Stage files**

```bash
git add src/main.ts src/routes/index.ts src/controllers/.gitkeep src/services/.gitkeep src/middleware/.gitkeep src/config/.gitkeep docs/superpowers/
git add -u src/application src/domain src/infrastructure src/shared
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: scaffold express server with standard folder structure"
```
