import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { ApiKey } from './ApiKey'
import type { Name } from '@valueObjects/Name'

export class Project extends AggregateRoot {
  private constructor(
    id: string,
    private _name: Name,
    public readonly ownerId: string,
    private _apiKey: ApiKey,
    public readonly jwtSecret: string,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get name(): string {
    return this._name.getValue()
  }

  get apiKey(): ApiKey {
    return this._apiKey
  }

  static create(
    id: string,
    name: Name,
    ownerId: string,
    apiKey: ApiKey,
    jwtSecret: string,
  ): Project {
    return new Project(id, name, ownerId, apiKey, jwtSecret, new Date())
  }

  static reconstruct(
    id: string,
    name: Name,
    ownerId: string,
    apiKey: ApiKey,
    jwtSecret: string,
    createdAt: Date,
  ): Project {
    return new Project(id, name, ownerId, apiKey, jwtSecret, createdAt)
  }

  revokeApiKey(): Project {
    return new Project(
      this.id,
      this._name,
      this.ownerId,
      this._apiKey.revoke(),
      this.jwtSecret,
      this.createdAt,
    )
  }

  reName(newName: Name): Project {
    return new Project(this.id, newName, this.ownerId, this._apiKey, this.jwtSecret, this.createdAt)
  }

  reNameApiKey(newName: Name): Project {
    return new Project(
      this.id,
      this._name,
      this.ownerId,
      this._apiKey.reName(newName),
      this.jwtSecret,
      this.createdAt,
    )
  }

  replaceApiKey(newApiKey: ApiKey): Project {
    return new Project(this.id, this._name, this.ownerId, newApiKey, this.jwtSecret, this.createdAt)
  }
}
