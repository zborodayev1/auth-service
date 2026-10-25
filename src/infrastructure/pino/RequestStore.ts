import { AsyncLocalStorage } from 'async_hooks'

interface RequestStoreData {
  requestId: string
}

export const requestStore = new AsyncLocalStorage<RequestStoreData>()
