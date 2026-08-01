import { injectable } from 'inversify'
import { User } from '@aggregates/user/User'
import type { UserRepository } from '@aggregates/user/UserRepository'
import type { Email } from '@valueObjects/Email'
import { userToDomain } from '../mappers/UserMapper'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaUserRepository extends PrismaRepository implements UserRepository {
  async save(user: User): Promise<void> {
    await this.prismaClient.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        projectId: user.projectId,
        email: user.email.toString(),
        passwordHash: user.password.getHash(),
        createdAt: user.createdAt,
      },
      update: {
        email: user.email.toString(),
        passwordHash: user.password.getHash(),
      },
    })
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.prismaClient.user.findUnique({ where: { id } })
    return raw ? userToDomain(raw) : null
  }

  async findByProjectAndEmail(projectId: string, email: Email): Promise<User | null> {
    const raw = await this.prismaClient.user.findUnique({
      where: { projectId_email: { projectId, email: email.toString() } },
    })
    return raw ? userToDomain(raw) : null
  }

  async findByProjectId(
    projectId: string,
    opts?: { limit: number; offset: number },
  ): Promise<User[]> {
    const raw = await this.prismaClient.user.findMany({
      where: { projectId },
      ...(opts && { take: opts.limit, skip: opts.offset }),
    })
    return raw.map(userToDomain)
  }

  async countByProjectId(projectId: string): Promise<number> {
    return this.prismaClient.user.count({ where: { projectId } })
  }

  async delete(id: string): Promise<void> {
    await this.prismaClient.user.delete({ where: { id } })
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.prismaClient.user.deleteMany({ where: { projectId } })
  }
}
