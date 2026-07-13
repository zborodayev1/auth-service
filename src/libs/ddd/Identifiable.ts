export abstract class Identifiable<T = string> {
  protected _id: T

  get id(): T {
    return this._id
  }

  protected constructor(id: T) {
    this._id = id
  }

  public sameIdentityAs(obj: Identifiable<T>): obj is this {
    return this._id === obj.id
  }

  public isTransient(): boolean {
    return !this._id
  }
}
