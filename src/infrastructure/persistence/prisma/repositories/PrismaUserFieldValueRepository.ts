import { injectable } from 'inversify'
import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'
import type { UserFieldValueRepository } from '@aggregates/userFieldValue/UserFieldValueRepository'
import { PrismaProvider } from '../PrismaProvider'
import { userFieldValueToDomain } from '../mappers/UserFieldValueMapper'

@injectable()
export class PrismaUserFieldValueRepository implements UserFieldValueRepository {
  constructor(private readonly prisma: PrismaProvider) {}

  async save(value: UserFieldValue): Promise<void> {
    await this.prisma.userFieldValue.upsert({
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
    await Promise.all(values.map((v) => this.save(v)))
  }

  async findByUserId(userId: string): Promise<UserFieldValue[]> {
    const raws = await this.prisma.userFieldValue.findMany({ where: { userId } })
    return raws.map(userFieldValueToDomain)
  }

  async findByUserAndField(userId: string, fieldId: string): Promise<UserFieldValue | null> {
    const raw = await this.prisma.userFieldValue.findUnique({
      where: { userId_fieldId: { userId, fieldId } },
    })
    return raw ? userFieldValueToDomain(raw) : null
  }

  async existsByFieldId(fieldId: string): Promise<boolean> {
    const count = await this.prisma.userFieldValue.count({ where: { fieldId } })
    return count > 0
  }
}
