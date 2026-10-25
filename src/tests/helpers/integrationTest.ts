import { it } from 'vitest'
import { environment } from '@tests/setup'

export function integrationTest(name: string, fn: () => Promise<void>): void {
  it(name, async () => {
    await environment.transaction.rollback(fn)
  })
}

integrationTest.each = <T extends unknown[]>(cases: readonly T[]) => {
  return (name: string, fn: (...args: T) => Promise<void>): void => {
    it.each(cases)(name, async (...args) => {
      await environment.transaction.rollback(() => fn(...args))
    })
  }
}
