/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
export abstract class ValueObject<T> {
  protected constructor() {}

  public static getHashCode(object: any): number {
    const value: string = this.getAtomicString(object)

    let hash = 0

    for (let i = 0; i < value.length; i++) {
      const char: number = value.charCodeAt(i)
      hash = hash * 32 - hash + char

      hash &= hash
    }

    return hash
  }

  private static getAtomicString(object: any): string {
    return Object.entries(object)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => key + this.stringify(value))
      .join('')
  }

  private static stringify(value: any): string {
    if (value == null) {
      return ''
    }

    if (typeof value.getHashCode === 'function' && typeof value.getAtomicString === 'function') {
      return value.getAtomicString()
    }

    if (typeof value === 'object') {
      return this.getAtomicString(value)
    }

    return value.toString()
  }

  public sameValueAs(obj: ValueObject<T>): boolean {
    return this.getHashCode() === obj.getHashCode()
  }

  public toString(): string {
    return Object.entries(this)
      .map(([key, value]: [string, any]) => (value != null ? `${key}: ${value}` : ''))
      .join(', ')
  }

  public getHashCode(): number {
    return ValueObject.getHashCode(this)
  }

  protected getAtomicString(): string {
    return ValueObject.getAtomicString(this)
  }
}
