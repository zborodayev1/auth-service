import { injectable } from 'inversify'
import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'
import type { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { userFieldValueToDomain } from '../mappers/UserFieldValueMapper'
import { PrismaRepository } from '../PrismaRepository'

@injectable()
export class PrismaUserFieldValueRepository
  extends PrismaRepository
  implements UserFieldValueRepository
{
  async save(value: UserFieldValue): Promise<void> {
    await this.prismaClient.userFieldValue.upsert({
      where: { userId_fieldId: { userId: value.userId, fieldId: value.fieldId } },
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
    for (const v of values) {
      await this.save(v)
    }
  }

  async findByUserId(userId: string): Promise<UserFieldValue[]> {
    const raws = await this.prismaClient.userFieldValue.findMany({ where: { userId } })
    return raws.map(userFieldValueToDomain)
  }

  async findByUserAndField(userId: string, fieldId: string): Promise<UserFieldValue | null> {
    const raw = await this.prismaClient.userFieldValue.findUnique({
      where: { userId_fieldId: { userId, fieldId } },
    })
    return raw ? userFieldValueToDomain(raw) : null
  }

  async existsByFieldId(fieldId: string): Promise<boolean> {
    const count = await this.prismaClient.userFieldValue.count({ where: { fieldId } })
    return count > 0
  }

  async deleteByFieldId(fieldId: string): Promise<void> {
    await this.prismaClient.userFieldValue.deleteMany({
      where: { fieldId },
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
