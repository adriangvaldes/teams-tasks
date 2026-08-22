import type { StoragePort } from './storage-port'

export function createMmkvStorage(): StoragePort | null {
  try {
    const { createMMKV } =
      require('react-native-mmkv') as typeof import('react-native-mmkv')

    const mmkv = createMMKV({ id: 'teams-tasks-cache' })

    mmkv.set('__probe__', '1')
    mmkv.remove('__probe__')

    return {
      name: 'mmkv',
      async getItem(key) {
        return mmkv.getString(key) ?? null
      },
      async setItem(key, value) {
        mmkv.set(key, value)
      },
      async removeItem(key) {
        mmkv.remove(key)
      },
    }
  } catch {
    return null
  }
}
