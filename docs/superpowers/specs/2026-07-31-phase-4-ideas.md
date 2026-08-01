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
