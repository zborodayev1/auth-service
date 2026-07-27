---
title: Phase 2 Backlog
date: 2026-07-22
status: backlog
---

# Phase 2 Backlog

Features deferred from Phase 1 (multi-tenant user schema). Implement after step 9 is complete and the system is working end-to-end.

---

## Soft Delete for ProjectField + UserFieldValue

**Context:** `DeleteProjectField` with `force=true` currently hard-deletes all `UserFieldValue` records for that field via cascade. This is irreversible.

**Idea:** Instead of hard deleting, mark records as deleted and purge after 24h — giving clients a recovery window.

**Implementation:**
1. Add `deletedAt DateTime?` to `ProjectField` and `UserFieldValue` in Prisma schema
2. All `findBy*` repository queries filter `WHERE deletedAt IS NULL`
3. Force delete sets `deletedAt = now()` on field + all its values instead of hard delete
4. Cron job purges records where `deletedAt < now() - 24h`
5. Add `RecoverProjectField` command (unsets `deletedAt`) as optional recovery endpoint

**Scope:** Schema migration, all ProjectField + UserFieldValue repos, cleanup job, optional recover endpoint.

---

## ProjectField Schema Cache

**Context:** `SchemaBuilderService.build()` is called on every `RegisterUser` and `LoginUser` request — rebuilds Zod schema from DB each time.

**Idea:** Cache generated `ZodObject` per `projectId` in `Map<string, ZodObject>`. Invalidate on any `AddProjectField`, `UpdateProjectField`, `DeleteProjectField`.

**Implementation:**
- Wrap `SchemaBuilderService` with an in-memory cache layer
- Inject cache invalidation into ProjectField command handlers
- Phase 2+: Redis cache for multi-instance deployments

---

## `force: true` SDK Flag for Field Deletion

**Context:** Delete constraint (reject if UserFieldValues exist) is currently hardcoded. Future SDK should expose this as configurable.

**Idea:** Client SDK passes `strict: true/false` when configuring a project schema. `strict: false` allows force delete without the conflict check.

---

## GetClientProjects Query

**Context:** Plan mentioned `GetClientProjectsQuery` as first query-side addition (CQRS read side).

**Implementation:** Simple query handler returning all projects for a `clientId`. No write side needed.
