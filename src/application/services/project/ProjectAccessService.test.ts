import { describe, expect, it, vi } from 'vitest'
import { ProjectAccessService } from './ProjectAccessService'
import type { ProjectRepository } from '@aggregates/project/ProjectRepository'
import type { UserRepository } from '@aggregates/user/UserRepository'
import { NotFoundError } from '@shared/errors/NotFoundError'
import type { Project } from '@aggregates/project/Project'
import type { User } from '@aggregates/user/User'

const stubProject = (ownerId: string): Project =>
  ({ id: 'proj-1', ownerId } as unknown as Project)

const stubUser = (projectId: string): User =>
  ({ id: 'user-1', projectId } as unknown as User)

const makeProjects = (project: Project | null): ProjectRepository =>
  ({ findById: vi.fn().mockResolvedValue(project) }) as unknown as ProjectRepository

const makeUsers = (user: User | null): UserRepository =>
  ({ findById: vi.fn().mockResolvedValue(user) }) as unknown as UserRepository

describe('ProjectAccessService', () => {
  describe('verifyByProjectId()', () => {
    it('throws NotFoundError PROJECT_NOT_FOUND when project missing', async () => {
      const svc = new ProjectAccessService(makeProjects(null), makeUsers(null))
      const err = await svc.verifyByProjectId('client-1', 'proj-1').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect((err as NotFoundError).reason).toBe('PROJECT_NOT_FOUND')
    })

    it('throws NotFoundError ACCESS_DENIED when wrong owner', async () => {
      const svc = new ProjectAccessService(makeProjects(stubProject('other')), makeUsers(null))
      const err = await svc.verifyByProjectId('client-1', 'proj-1').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect((err as NotFoundError).reason).toBe('ACCESS_DENIED')
    })

    it('returns project when owner matches', async () => {
      const project = stubProject('client-1')
      const svc = new ProjectAccessService(makeProjects(project), makeUsers(null))
      await expect(svc.verifyByProjectId('client-1', 'proj-1')).resolves.toBe(project)
    })
  })

  describe('verifyByUserId()', () => {
    it('throws NotFoundError USER_NOT_FOUND when user missing', async () => {
      const svc = new ProjectAccessService(makeProjects(null), makeUsers(null))
      const err = await svc.verifyByUserId('client-1', 'user-1').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect((err as NotFoundError).reason).toBe('USER_NOT_FOUND')
    })

    it('throws NotFoundError PROJECT_NOT_FOUND when project missing', async () => {
      const svc = new ProjectAccessService(makeProjects(null), makeUsers(stubUser('proj-1')))
      const err = await svc.verifyByUserId('client-1', 'user-1').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect((err as NotFoundError).reason).toBe('PROJECT_NOT_FOUND')
    })

    it('throws NotFoundError ACCESS_DENIED when wrong owner', async () => {
      const svc = new ProjectAccessService(
        makeProjects(stubProject('other')),
        makeUsers(stubUser('proj-1')),
      )
      const err = await svc.verifyByUserId('client-1', 'user-1').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(NotFoundError)
      expect((err as NotFoundError).reason).toBe('ACCESS_DENIED')
    })

    it('returns { project, user } when all valid', async () => {
      const project = stubProject('client-1')
      const user = stubUser('proj-1')
      const svc = new ProjectAccessService(makeProjects(project), makeUsers(user))
      const result = await svc.verifyByUserId('client-1', 'user-1')
      expect(result.project).toBe(project)
      expect(result.user).toBe(user)
    })
  })
})
