import type { Email } from '@aggregates/client/Email'
import type { Password } from '@aggregates/client/Password'
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

  static create(id: string, projectId: string, email: Email, password: Password): User {
    return new User(id, projectId, email, password, new Date())
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
