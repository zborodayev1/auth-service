export interface IJob {
  start(): void
  stop(): Promise<void>
}

export const IJob: unique symbol = Symbol('IJob')
