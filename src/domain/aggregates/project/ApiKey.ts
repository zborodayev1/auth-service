import { Identifiable } from '@libs/ddd/Identifiable'
import type { Name } from '@valueObjects/Name'

export class ApiKey extends Identifiable {
  constructor(
    id: string,
    private _name: Name,
    public readonly hash: string,
    public readonly revoked: boolean,
    public readonly createdAt: Date,
  ) {
    super(id)
  }

  get name(): string {
    return this._name.getValue()
  }

  static reconstruct(
    id: string,
    name: Name,
    hash: string,
    revoked: boolean,
    createdAt: Date,
  ): ApiKey {
    return new ApiKey(id, name, hash, revoked, createdAt)
  }

  revoke(): ApiKey {
    return new ApiKey(this.id, this._name, this.hash, true, this.createdAt)
  }

  reName(newName: Name): ApiKey {
    return new ApiKey(this.id, newName, this.hash, this.revoked, this.createdAt)
  }
}
