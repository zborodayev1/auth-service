import { AggregateRoot } from '@libs/ddd/AggregateRoot'
import type { ApiKey } from './ApiKey'
import type { Name } from '@valueObjects/Name'

export class Project extends AggregateRoot {
  private constructor(
    id: string,
    private _name: Name,
    public readonly ownerId: string,
    private _apiKey: ApiKey,
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

  static create(id: string, name: Name, ownerId: string, apiKey: ApiKey): Project {
    return new Project(id, name, ownerId, apiKey, new Date())
  }

  static reconstruct(
    id: string,
    name: Name,
    ownerId: string,
    apiKey: ApiKey,
    createdAt: Date,
  ): Project {
    return new Project(id, name, ownerId, apiKey, createdAt)
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
