import Constants from 'expo-constants'
import { Platform } from 'react-native'

const DEFAULT_API_PORT = 3333

/**
 * Descobre a URL da API em desenvolvimento.
 *
 * Este e o atrito numero um para quem clona o projeto: `localhost` significa
 * coisas diferentes em cada alvo.
 *
 * - Celular fisico: localhost e o proprio celular. Precisamos do IP da maquina
 *   na rede - que o Metro ja conhece, via hostUri. Reaproveitar esse valor
 *   evita pedir ao usuario que descubra e configure o IP na mao.
 * - Emulador Android: localhost e o emulador; 10.0.2.2 e o host.
 * - iOS simulator e web: localhost funciona normalmente.
 */
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

/**
 * Em producao (ou apontando para o deploy do Railway), defina
 * EXPO_PUBLIC_API_URL no .env. Variaveis com prefixo EXPO_PUBLIC_ sao
 * embutidas no bundle pelo proprio Expo - por isso nunca coloque segredo aqui.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? inferDevelopmentApiUrl()
).replace(/\/+$/, '')

export const API_TIMEOUT_MS = 15_000
