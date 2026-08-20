import { configure } from '@testing-library/react-native'

configure({ asyncUtilTimeout: 5000 })

/**
 * O MMKV é módulo nativo e não existe no ambiente de teste. O adapter real já
 * cai para AsyncStorage quando o require falha, mas mockar aqui evita o custo
 * de disparar e capturar essa exceção em cada suíte.
 */
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    throw new Error('MMKV indisponível em ambiente de teste')
  },
}))

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>()

  return {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key)
    }),
  }
})
