import { describe, expect, it } from 'vitest'
import { ProjectField } from './ProjectField'

const makeField = (): ProjectField =>
  ProjectField.create({
    id: 'field-id',
    projectId: 'project-id',
    name: 'bio',
    type: 'string',
    required: false,
    defaultValue: null,
    enumValues: [],
  })

describe('ProjectField', () => {
  describe('create()', () => {
    it('sets correct values', () => {
      const field = makeField()

      expect(field.id).toBe('field-id')
      expect(field.projectId).toBe('project-id')
      expect(field.name).toBe('bio')
      expect(field.type).toBe('string')
      expect(field.required).toBe(false)
      expect(field.defaultValue).toBeNull()
      expect(field.enumValues).toEqual([])
      expect(field.deletedAt).toBeNull()
    })
  })

  describe('update()', () => {
    it('returns new instance with updated name', () => {
      const field = makeField()
      const updated = field.update({ name: 'description' })

      expect(updated.name).toBe('description')
    })

    it('returns new instance with updated required', () => {
      const field = makeField()
      const updated = field.update({ required: true })

      expect(updated.required).toBe(true)
    })

    it('returns new instance with updated defaultValue', () => {
      const field = makeField()
      const updated = field.update({ defaultValue: 'unknown' })

      expect(updated.defaultValue).toBe('unknown')
    })

    it('preserves unchanged fields', () => {
      const field = makeField()
      const updated = field.update({ name: 'description' })

      expect(updated.type).toBe(field.type)
      expect(updated.projectId).toBe(field.projectId)
      expect(updated.required).toBe(field.required)
    })

    it('does not mutate original', () => {
      const field = makeField()
      field.update({ name: 'description' })

      expect(field.name).toBe('bio')
    })

    it('returns different instance', () => {
      const field = makeField()
      expect(field.update({ name: 'description' })).not.toBe(field)
    })
  })

  describe('recover()', () => {
    it('returns new instance with deletedAt null', () => {
      const field = ProjectField.reconstruct(
        'field-id',
        'project-id',
        'bio',
        'string',
        false,
        null,
        [],
        new Date(),
        new Date(),
      )
      const recovered = field.recover()

      expect(recovered.deletedAt).toBeNull()
    })

    it('does not mutate original', () => {
      const deletedAt = new Date()
      const field = ProjectField.reconstruct(
        'field-id',
        'project-id',
        'bio',
        'string',
        false,
        null,
        [],
        new Date(),
        deletedAt,
      )
      field.recover()

      expect(field.deletedAt).toBe(deletedAt)
    })

    it('returns different instance', () => {
      const field = ProjectField.reconstruct(
        'field-id',
        'project-id',
        'bio',
        'string',
        false,
        null,
        [],
        new Date(),
        new Date(),
      )
      expect(field.recover()).not.toBe(field)
    })
  })
})
