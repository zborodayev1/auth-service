import { describe, expect, it } from 'vitest'
import { UserFieldValue } from './UserFieldValue'

const makeValue = (): UserFieldValue =>
  UserFieldValue.create({
    id: 'value-id',
    userId: 'user-id',
    fieldId: 'field-id',
    value: 'hello',
  })

describe('UserFieldValue', () => {
  describe('create()', () => {
    it('sets correct values', () => {
      const fv = makeValue()

      expect(fv.id).toBe('value-id')
      expect(fv.userId).toBe('user-id')
      expect(fv.fieldId).toBe('field-id')
      expect(fv.value).toBe('hello')
      expect(fv.deletedAt).toBeNull()
      expect(fv.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('reconstruct()', () => {
    it('preserves all fields including deletedAt', () => {
      const deletedAt = new Date()
      const updatedAt = new Date()

      const fv = UserFieldValue.reconstruct('id', 'uid', 'fid', 'val', updatedAt, deletedAt)

      expect(fv.id).toBe('id')
      expect(fv.value).toBe('val')
      expect(fv.deletedAt).toBe(deletedAt)
      expect(fv.updatedAt).toBe(updatedAt)
    })
  })
})
