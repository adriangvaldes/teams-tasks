import { createAsyncStorageAdapter } from './async-storage'
import { createMmkvStorage } from './mmkv-storage'
import type { StoragePort } from './storage-port'

export const appStorage: StoragePort =
  createMmkvStorage() ?? createAsyncStorageAdapter()

export type { StoragePort }
