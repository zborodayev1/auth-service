import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { Email } from './Email'
import type { Password } from './Password'
import type { Name } from '@valueObjects/Name'

export class Client extends AggregateRoot {
  private constructor(
    id: string,
    private _name: Name,
    private _email: Email,
    private _password: Password,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get email(): Email {
    return this._email
  }

  get name(): string {
    return this._name.getValue()
  }

  get password(): Password {
    return this._password
  }

  static create(id: string, name: Name, email: Email, password: Password): Client {
    const client = new Client(id, name, email, password, new Date())
    // client.addDomainEvent({ eventName: 'ClientRegistered', occurredAt: new Date() })
    return client
  }

  static reconstruct(
    id: string,
    name: Name,
    email: Email,
    password: Password,
    createdAt: Date,
  ): Client {
    return new Client(id, name, email, password, createdAt)
  }

  reName(newName: Name): Client {
    return new Client(this.id, newName, this._email, this._password, this.createdAt)
  }

  changeEmail(newEmail: Email): Client {
    return new Client(this.id, this._name, newEmail, this._password, this.createdAt)
  }

  changePassword(newPassword: Password): Client {
    return new Client(this.id, this._name, this._email, newPassword, this.createdAt)
  }
}
