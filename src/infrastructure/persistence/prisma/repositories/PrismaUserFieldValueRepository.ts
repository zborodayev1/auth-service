import { injectable, inject } from 'inversify'
import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'
import type { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { userFieldValueToDomain } from '../mappers/UserFieldValueMapper'
import { TransactionContext } from '../TransactionContext'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaUserFieldValueRepository
  extends PrismaRepository
  implements UserFieldValueRepository
{
  constructor(@inject(TransactionContext) ctx: TransactionContext) {
    super(ctx)
  }

  async save(value: UserFieldValue): Promise<void> {
    await this.prismaClient.userFieldValue.upsert({
      where: { id: value.id },
      create: {
        id: value.id,
        userId: value.userId,
        fieldId: value.fieldId,
        value: value.value,
      },
      update: { value: value.value },
    })
  }

  async saveMany(values: UserFieldValue[]): Promise<void> {
    await Promise.all(values.map((v) => this.save(v)))
  }

  async findByUserId(userId: string): Promise<UserFieldValue[]> {
    const raws = await this.prismaClient.userFieldValue.findMany({
      where: { userId, deletedAt: null },
    })
    return raws.map(userFieldValueToDomain)
  }

  async findByUserAndField(userId: string, fieldId: string): Promise<UserFieldValue | null> {
    const raw = await this.prismaClient.userFieldValue.findFirst({
      where: { userId, fieldId, deletedAt: null },
    })
    return raw ? userFieldValueToDomain(raw) : null
  }

  async existsByFieldId(fieldId: string): Promise<boolean> {
    const count = await this.prismaClient.userFieldValue.count({
      where: { fieldId, deletedAt: null },
    })
    return count > 0
  }

  async recoverByFieldId(fieldId: string): Promise<void> {
    await this.prismaClient.userFieldValue.updateMany({
      where: { fieldId, deletedAt: { not: null } },
      data: { deletedAt: null },
    })
  }

  async deleteByFieldId(fieldId: string): Promise<void> {
    await this.prismaClient.userFieldValue.updateMany({
      where: { fieldId },
      data: { deletedAt: new Date() },
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prismaClient.userFieldValue.deleteMany({ where: { userId } })
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.prismaClient.userFieldValue.deleteMany({
      where: { user: { projectId } },
    })
  }
}
