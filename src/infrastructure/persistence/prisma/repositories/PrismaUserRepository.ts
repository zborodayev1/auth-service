import { injectable } from 'inversify'
import { User } from '@aggregates/user/User'
import type { UserRepository } from '@aggregates/user/UserRepository'
import type { Email } from '@aggregates/client/Email'
import { PrismaProvider } from '../PrismaProvider'
import { userToDomain } from '../mappers/UserMapper'

@injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
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
    const raw = await this.prisma.user.findUnique({ where: { id } })
    return raw ? userToDomain(raw) : null
  }

  async findByProjectAndEmail(projectId: string, email: Email): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { projectId_email: { projectId, email: email.toString() } },
    })
    return raw ? userToDomain(raw) : null
  }
}
