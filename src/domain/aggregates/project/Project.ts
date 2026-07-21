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

  revokeApiKey(): void {
    this._apiKey = this._apiKey.revoke()
  }

  reName(newName: Name): void {
    this._name = newName
  }

  reNameApiKey(newName: Name): void {
    this._apiKey = this._apiKey.reName(newName)
  }
}
