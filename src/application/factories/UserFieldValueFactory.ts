import { UserFieldValue } from '@aggregates/userFieldValue/UserFieldValue'
import { IdGenerator } from '@ports/IdGenerator'
import { inject, injectable } from 'inversify'

interface UserFieldValueParams {
  userId: string
  fieldId: string
  value: string
}
@injectable()
export class UserFieldValueFactory {
  constructor(@inject(IdGenerator) private readonly idGenerator: IdGenerator) {}

  create(params: UserFieldValueParams): UserFieldValue {
    return UserFieldValue.create({
      id: this.idGenerator.generate(),
      userId: params.userId,
      fieldId: params.fieldId,
      value: params.value,
    })
  }
}
