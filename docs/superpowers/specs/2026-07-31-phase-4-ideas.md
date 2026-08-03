---
title: Phase 4 — Ideas Under Consideration
date: 2026-07-31
status: ideas
---

# Phase 4 — Ideas Under Consideration

## 4.1 — GraphQL API / Field Selection

**Status:** идея, на рассмотрении

**Контекст:**
REST хендлеры (`GetProjectUser`, `GetProjectUserFields`, `GetAdminUser`) имеют одинаковую логику (ownership check + join fields+values), отличается только форма ответа. Клиентская либа будет единственным потребителем API — она могла бы сама выбирать нужные поля.

**Идея:**
Перейти на GraphQL — один resolver возвращает полный объект, клиент берёт нужное. Убирает дублирование хендлеров с похожей логикой.

**Что потребует:**
- GraphQL схема (типы, resolvers)
- DataLoader для N+1 проблемы (fields/values)
- Замена или дополнение текущего REST слоя
- Интеграция с будущей клиентской либой

**Связь:** актуально когда клиентская либа начнёт активно разрабатываться.

---

## 4.2 — Soft Delete для Client / User / Project

**Status:** идея, требует проработки

**Контекст:**
Phase 2.5 добавляет soft delete только для `ProjectField` и `UserFieldValue`. `Client`, `User`, `Project` удаляются необратимо, несмотря на то что удаление требует подтверждения паролем.

**Вопросы для проработки:**
- Cascade soft delete: удаление Project → soft delete Users → Sessions → Tokens → FieldValues — большая сложность
- GDPR: пользователь вправе требовать полного удаления данных, soft delete этому мешает
- Recovery workflow: кто восстанавливает и через какой интерфейс?
- TTL перед hard purge: сколько хранить?

**Решение принять до реализации.**
