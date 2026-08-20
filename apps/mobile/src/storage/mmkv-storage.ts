import type { StoragePort } from './storage-port'

/**
 * Adapter MMKV. Rápido e síncrono, mas exige módulo nativo: no Expo Go a
 * importação falha.
 *
 * Por isso o `require` dentro do try, e não um import estático no topo — um
 * import estático derrubaria o bundle inteiro no Expo Go, antes de qualquer
 * código nosso rodar. Aqui a falha é detectada e o app cai para AsyncStorage.
 *
 * A API é a da v4 do react-native-mmkv: `createMMKV()`, e não `new MMKV()`.
 */
export function createMmkvStorage(): StoragePort | null {
  try {
    const { createMMKV } =
      require('react-native-mmkv') as typeof import('react-native-mmkv')

    const mmkv = createMMKV({ id: 'teams-tasks-cache' })

    // Confirma que o módulo nativo respondeu de fato: em algumas combinações o
    // require passa e é a primeira operação que estoura.
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
