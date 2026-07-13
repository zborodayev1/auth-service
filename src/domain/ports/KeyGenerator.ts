export interface KeyGenerator {
  generate(bytes?: number, encoding?: BufferEncoding): string
}

export const KeyGenerator: unique symbol = Symbol('KeyGenerator')
