export interface Hasher {
  hash(value: string): string
}

export const Hasher: unique symbol = Symbol('Hasher')
