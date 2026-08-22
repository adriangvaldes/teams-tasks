import { configure } from '@testing-library/react-native'

configure({ asyncUtilTimeout: 5000 })

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
