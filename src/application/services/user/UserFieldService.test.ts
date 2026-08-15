import { describe, expect, it, vi } from 'vitest'
import { UserFieldService } from './UserFieldService'
import type { ProjectFieldRepository } from '@aggregates/projectField/ProjectFieldRepository'
import type { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { ProjectField } from '@aggregates/projectField/ProjectField'
import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'

const stubField = (id: string): ProjectField =>
  ProjectField.create({ id, projectId: 'proj-1', name: `field-${id}`, type: 'string', required: false, defaultValue: null, enumValues: [] })

const stubValue = (fieldId: string, value: string): UserFieldValue =>
  UserFieldValue.create({ id: `val-${fieldId}`, userId: 'user-1', fieldId, value })

const makeProjectFields = (fields: ProjectField[]): ProjectFieldRepository =>
  ({ findByProjectId: vi.fn().mockResolvedValue(fields) }) as unknown as ProjectFieldRepository

const makeUserFields = (values: UserFieldValue[]): UserFieldValueRepository =>
  ({ findByUserId: vi.fn().mockResolvedValue(values) }) as unknown as UserFieldValueRepository

const makeService = (fields: ProjectField[], values: UserFieldValue[]): UserFieldService =>
  new UserFieldService(makeProjectFields(fields), makeUserFields(values))

describe('UserFieldService', () => {
  describe('getFieldsWithValues()', () => {
    it('returns empty array when no fields', async () => {
      const result = await makeService([], []).getFieldsWithValues('user-1', 'proj-1')
      expect(result).toEqual([])
    })

    it('maps value to field when fieldId matches', async () => {
      const field = stubField('f1')
      const value = stubValue('f1', 'hello')
      const result = await makeService([field], [value]).getFieldsWithValues('user-1', 'proj-1')
      expect(result[0]?.value).toBe('hello')
    })

    it('sets value to null when no matching UserFieldValue', async () => {
      const field = stubField('f1')
      const result = await makeService([field], []).getFieldsWithValues('user-1', 'proj-1')
      expect(result[0]?.value).toBeNull()
    })

    it('maps multiple fields correctly with mixed values', async () => {
      const f1 = stubField('f1')
      const f2 = stubField('f2')
      const v1 = stubValue('f1', 'one')
      const result = await makeService([f1, f2], [v1]).getFieldsWithValues('user-1', 'proj-1')
      expect(result).toHaveLength(2)
      expect(result.find((r) => r.id === 'f1')?.value).toBe('one')
      expect(result.find((r) => r.id === 'f2')?.value).toBeNull()
    })
  })
})
