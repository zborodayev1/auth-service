import type { CodeOf } from './defineCodes'
import { defineCodes } from './defineCodes'

export const CONFLICT_ERROR_CODES = defineCodes('conflict', {
  ALREADY_EXISTS: {},
  PRECONDITION_FAILED: {},
})

export const NOT_FOUND_ERROR_CODES = defineCodes('not_found', {
  RESOURCE_NOT_FOUND: {},
  ACCESS_DENIED: {},
})

export const AUTH_ERROR_CODES = defineCodes('auth', {
  UNAUTHENTICATED: {
    expose: true,
  },
  INVALID_CREDENTIALS: {},
  SESSION_EXPIRED: {
    expose: true,
  },

  TOKEN_EXPIRED: {
    expose: true,
  },

  TOKEN_REUSED: {},
})

export const VALIDATION_ERROR_CODES = defineCodes('validation', {
  INVALID_INPUT: {},
})

export const INTERNAL_ERROR_CODES = defineCodes('internal', {
  INTERNAL_ERROR: {},
})

export type ConflictCode = CodeOf<typeof CONFLICT_ERROR_CODES>

export type NotFoundCode = CodeOf<typeof NOT_FOUND_ERROR_CODES>

export type AuthCode = CodeOf<typeof AUTH_ERROR_CODES>

export type ValidationCode = CodeOf<typeof VALIDATION_ERROR_CODES>

export type InternalErrorCode = CodeOf<typeof INTERNAL_ERROR_CODES>
