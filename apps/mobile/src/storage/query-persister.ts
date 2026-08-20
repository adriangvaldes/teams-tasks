import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'
import type { StoragePort } from './storage-port'

const CACHE_KEY = 'teams-tasks:react-query-cache'

/**
 * Versao do formato persistido. Ao mudar a forma de um DTO, incrementar aqui
 * descarta o cache antigo em vez de reidratar dado incompativel na tela.
 */
const CACHE_VERSION = 'v1'

const WRITE_THROTTLE_MS = 1_000

/**
 * Persistidor do cache do React Query sobre a nossa StoragePort.
 *
 * Escrito a mao (em lugar de @tanstack/query-async-storage-persister) por dois
 * motivos: uma dependencia menos, e o controle do versionamento acima - que e
 * o que evita "o app abriu com dado de um formato que nao existe mais".
 *
 * As escritas sao agrupadas: sem throttle, cada mutacao otimista gravaria o
 * cache inteiro em disco, varias vezes por segundo.
 */
export function createQueryPersister(storage: StoragePort): Persister {
  let pending: PersistedClient | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = async (): Promise<void> => {
    timer = null
    if (!pending) return

    const client = pending
    pending = null

    try {
      await storage.setItem(
        CACHE_KEY,
        JSON.stringify({ version: CACHE_VERSION, client }),
      )
    } catch {
      // Falha ao persistir nao pode derrubar a UI: o app segue funcionando
      // apenas sem cache offline.
    }
  }

  return {
    persistClient: (client) => {
      pending = client

      if (!timer) {
        timer = setTimeout(() => {
          void flush()
        }, WRITE_THROTTLE_MS)
      }
    },

    restoreClient: async () => {
      try {
        const raw = await storage.getItem(CACHE_KEY)
        if (!raw) return undefined

        const parsed = JSON.parse(raw) as {
          version?: string
          client?: PersistedClient
        }

        if (parsed.version !== CACHE_VERSION) return undefined

        return parsed.client
      } catch {
        return undefined
      }
    },

    removeClient: async () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      pending = null

      await storage.removeItem(CACHE_KEY)
    },
  }
}
