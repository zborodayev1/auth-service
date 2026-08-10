import { describe, expect, it } from 'vitest'
import { Project } from './Project'
import { ApiKey } from './ApiKey'
import { Name } from '@valueObjects/Name/Name'

const makeApiKey = (): ApiKey =>
  ApiKey.reconstruct('apikey-id', Name.create('myapikeyname'), 'somehash', false, new Date())

const makeProject = (): Project =>
  Project.create(
    'project-id',
    Name.create('myprojectname'),
    'owner-id',
    makeApiKey(),
    'jwt-secret',
  )

describe('Project', () => {
  describe('create()', () => {
    it('returns Project with correct values', () => {
      const project = makeProject()

      expect(project.id).toBe('project-id')
      expect(project.name).toBe('myprojectname')
      expect(project.ownerId).toBe('owner-id')
      expect(project.jwtSecret).toBe('jwt-secret')
    })
  })

  describe('reName()', () => {
    it('returns new instance with updated name', () => {
      const project = makeProject()
      const renamed = project.reName(Name.create('newprojectname'))

      expect(renamed.name).toBe('newprojectname')
    })

    it('does not mutate original', () => {
      const project = makeProject()
      project.reName(Name.create('newprojectname'))

      expect(project.name).toBe('myprojectname')
    })

    it('returns different instance', () => {
      const project = makeProject()
      const renamed = project.reName(Name.create('newprojectname'))

      expect(renamed).not.toBe(project)
    })
  })

  describe('reNameApiKey()', () => {
    it('returns new instance with updated api key name', () => {
      const project = makeProject()
      const updated = project.reNameApiKey(Name.create('newapikeyname'))

      expect(updated.apiKey.name).toBe('newapikeyname')
    })

    it('does not mutate original', () => {
      const project = makeProject()
      project.reNameApiKey(Name.create('newapikeyname'))

      expect(project.apiKey.name).toBe('myapikeyname')
    })

    it('returns different instance', () => {
      const project = makeProject()
      const updated = project.reNameApiKey(Name.create('newapikeyname'))

      expect(updated).not.toBe(project)
    })
  })

  describe('revokeApiKey()', () => {
    it('returns new instance with revoked api key', () => {
      const project = makeProject()
      const revoked = project.revokeApiKey()

      expect(revoked.apiKey.revoked).toBe(true)
    })

    it('does not mutate original', () => {
      const project = makeProject()
      project.revokeApiKey()

      expect(project.apiKey.revoked).toBe(false)
    })

    it('returns different instance', () => {
      const project = makeProject()
      const revoked = project.revokeApiKey()

      expect(revoked).not.toBe(project)
    })
  })
})

describe('ApiKey', () => {
  describe('revoke()', () => {
    it('returns new instance with revoked=true', () => {
      const apiKey = makeApiKey()
      const revoked = apiKey.revoke()

      expect(revoked.revoked).toBe(true)
    })

    it('does not mutate original', () => {
      const apiKey = makeApiKey()
      apiKey.revoke()

      expect(apiKey.revoked).toBe(false)
    })

    it('returns different instance', () => {
      const apiKey = makeApiKey()
      const revoked = apiKey.revoke()

      expect(revoked).not.toBe(apiKey)
    })
  })

  describe('reName()', () => {
    it('returns new instance with updated name', () => {
      const apiKey = makeApiKey()
      const renamed = apiKey.reName(Name.create('newapikeyname'))

      expect(renamed.name).toBe('newapikeyname')
    })

    it('does not mutate original', () => {
      const apiKey = makeApiKey()
      apiKey.reName(Name.create('newapikeyname'))

      expect(apiKey.name).toBe('myapikeyname')
    })

    it('returns different instance', () => {
      const apiKey = makeApiKey()
      const renamed = apiKey.reName(Name.create('newapikeyname'))

      expect(renamed).not.toBe(apiKey)
    })
  })
})
