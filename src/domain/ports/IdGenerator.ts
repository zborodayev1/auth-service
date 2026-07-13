export interface IdGenerator {
  generate(): string
}

export const IdGenerator: unique symbol = Symbol('IdGenerator')
