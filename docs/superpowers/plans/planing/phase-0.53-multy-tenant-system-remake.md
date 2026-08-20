---
title: Phase 0.53 — Multy tenant system remake
date: 2026-08-15
status: planning
priority: high
---

# Phase 0.53 — Password Reset & Email Verification

Переделать authorization-модель так, чтобы:

Client имел полный контроль над своими User внутри tenant/project;
Client A никогда не мог получить доступ к User принадлежащему Client B;
projectId и clientId не передавались как доверенные данные от клиента;
authentication и authorization были разделены;
Client API и User API имели разные auth contexts;
authorization не размазывалась ручными if (projectId !== ...) по каждому handler;
подготовить систему к будущим roles/scopes внутри Client;
дать безопасную основу для Client → User password reset, email verification, session management и CRUD.

---
