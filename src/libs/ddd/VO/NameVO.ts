import { ValueObject } from '../ValueObject'

export abstract class NameVO<T> extends ValueObject<T> {
  protected constructor(private readonly value: string) {
    super()
  }
  getValue(): string {
    return this.value
  }
}
