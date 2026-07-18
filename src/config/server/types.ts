export const environments = ['development', 'production', 'test'] as const

export type Environment = (typeof environments)[number]

export const logLevels = ['debug', 'info', 'warn', 'error'] as const

export type LogLevel = (typeof logLevels)[number]
