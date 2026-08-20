import { createAsyncStorageAdapter } from './async-storage'
import { createMmkvStorage } from './mmkv-storage'
import type { StoragePort } from './storage-port'

/**
 * Escolhe a implementacao uma unica vez, na inicializacao. MMKV quando
 * disponivel (dev client / build nativo), AsyncStorage no Expo Go e na web.
 */
export const appStorage: StoragePort =
  createMmkvStorage() ?? createAsyncStorageAdapter()

export type { StoragePort }
