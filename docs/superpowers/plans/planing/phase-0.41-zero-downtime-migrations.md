---
title: Phase 0.41 — Zero-Downtime DB Migrations
date: 2026-08-15
status: planning
priority: medium — required before any production deployment with live traffic; wrong migration order causes downtime or data loss
---

# Phase 0.41 — Zero-Downtime DB Migrations

`prisma migrate dev` is for local development. `prisma migrate deploy` applies existing migrations — but not all schema changes are safe under concurrent traffic. This phase establishes the expand-contract pattern and wires migration into CI/CD deploy.

---

## 0.41.1 — Expand-contract pattern

Every breaking schema change is split into 3 migrations across 3 deploys:

**Phase 1 — Expand:** add new column/table as nullable. Old code ignores it, new code writes to it.

**Phase 2 — Migrate:** backfill existing rows. Old code still works (column nullable). New code reads from new column.

**Phase 3 — Contract:** make column NOT NULL / drop old column. Only after all instances run new code.

**Examples:**

| Change | Safe? | Pattern |
|--------|-------|---------|
| Add nullable column | ✅ Safe | Single migration |
| Add NOT NULL column with default | ✅ Safe | Single migration |
| Add NOT NULL column without default | ❌ Unsafe | Expand-migrate-contract |
| Rename column | ❌ Unsafe | Add new + copy + drop old |
| Drop column | ❌ Unsafe | Deploy code ignoring it first, then drop |
| Add index (non-unique) | ✅ Safe | `CREATE INDEX CONCURRENTLY` |
| Add unique constraint | ⚠️ Risky | Backfill + verify uniqueness first |

---

## 0.41.2 — `CREATE INDEX CONCURRENTLY`

Prisma generates `CREATE INDEX` which locks the table. For large tables use `CONCURRENTLY`:

```sql
-- Manually edit migration file after `prisma migrate dev --create-only`:
CREATE INDEX CONCURRENTLY "Session_clientId_idx" ON "Session"("clientId");
```

Note: `CONCURRENTLY` cannot run inside a transaction. Add `-- prisma-no-transaction` comment to migration file if needed.

---

## 0.41.3 — CI/CD integration

In `docker-compose.yml` app service (from Phase 0.34):
```yaml
command: sh -c "npx prisma migrate deploy && node dist/main.js"
```

In Kubernetes (Phase 0.42): use an init container:
```yaml
initContainers:
  - name: migrate
    image: auth-service:latest
    command: ["npx", "prisma", "migrate", "deploy"]
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: auth-secrets
            key: database-url
```

Init container runs before app pods start. Ensures migration completes before any app instance handles traffic.

---

## 0.41.4 — Migration checklist (document)

Add `docs/migration-checklist.md` with rules:

```markdown
Before every schema change:
1. Is this a breaking change? (rename, drop, add NOT NULL without default)
   - Yes → use expand-contract over 3 PRs
   - No → single migration OK
2. Adding an index on a large table?
   - Use CREATE INDEX CONCURRENTLY
   - Add --create-only flag, edit migration file manually
3. After migration runs in prod:
   - Check pg_stat_activity for blocked queries
   - Verify table is accessible: SELECT 1 FROM "<table>" LIMIT 1
```

---

## Priority Order

1. Document the expand-contract pattern (done above)
2. Audit existing planned migrations (0.38 lockout columns, 0.39 audit log) for safety
3. Wire `migrate deploy` into CI deploy job
4. Add init container pattern to Kubernetes config (Phase 0.42)
