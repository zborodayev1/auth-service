import type { Email } from '@valueObjects/Email'
import type { Password } from '@valueObjects/Password'
import { AggregateRoot } from '@libs/ddd/AggregateRoot'

export class User extends AggregateRoot {
  private constructor(
    id: string,
    public readonly projectId: string,

    private _email: Email,
    private _password: Password,

    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get email(): Email {
    return this._email
  }

  get password(): Password {
    return this._password
  }

  static create(params: { id: string; projectId: string; email: Email; password: Password }): User {
    return new User(params.id, params.projectId, params.email, params.password, new Date())
  }

  static reconstruct(
    id: string,
    projectId: string,
    email: Email,
    password: Password,
    createdAt: Date,
  ): User {
    return new User(id, projectId, email, password, createdAt)
  }
}
