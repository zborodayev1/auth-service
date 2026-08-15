export interface IJob {
  start(): Promise<void>
  stop(): Promise<void>
}

export const IJob: unique symbol = Symbol('IJob')
