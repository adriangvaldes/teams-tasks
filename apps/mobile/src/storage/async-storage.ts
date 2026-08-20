import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StoragePort } from './storage-port'

/**
 * Fallback compativel com Expo Go e web. Mais lento que o MMKV, porem sem
 * modulo nativo proprio - o que garante que `pnpm dev:mobile` funcione sem
 * nenhum build customizado.
 */
export function createAsyncStorageAdapter(): StoragePort {
  return {
    name: 'async-storage',
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  }
}
