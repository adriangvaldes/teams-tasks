import Constants from 'expo-constants'
import { Platform } from 'react-native'

const DEFAULT_API_PORT = 3333

function inferDevelopmentApiUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost
  const metroHost = hostUri?.split(':')[0]

  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:${DEFAULT_API_PORT}`
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`
  }

  return `http://localhost:${DEFAULT_API_PORT}`
}

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? inferDevelopmentApiUrl()
).replace(/\/+$/, '')

export const API_TIMEOUT_MS = 15_000
