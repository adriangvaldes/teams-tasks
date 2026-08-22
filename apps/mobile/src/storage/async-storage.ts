import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StoragePort } from './storage-port'

export function createAsyncStorageAdapter(): StoragePort {
  return {
    name: 'async-storage',
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  }
}
