export interface UnitOfWork {
  execute<T>(fn: () => Promise<T>): Promise<T>
}
export const UnitOfWork: unique symbol = Symbol('UnitOfWork')
