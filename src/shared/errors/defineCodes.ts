export interface ErrorCodeOptions {
  expose?: boolean
}

export interface ErrorCode extends ErrorCodeOptions {
  code: string
}

export type CodeOf<T> = T[keyof T]

export function defineCodes<const T extends Record<string, ErrorCodeOptions>>(
  namespace: string,
  definitions: T,
): {
  [K in keyof T]: {
    code: `${typeof namespace}.${Extract<K, string>}`
  } & T[K]
} {
  return Object.fromEntries(
    Object.entries(definitions).map(([name, options]) => [
      name,
      {
        code: `${namespace}.${name}`,
        ...options,
      },
    ]),
  ) as {
    [K in keyof T]: {
      code: `${typeof namespace}.${Extract<K, string>}`
    } & T[K]
  }
}
