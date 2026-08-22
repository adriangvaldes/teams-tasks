import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'
import type { StoragePort } from './storage-port'

const CACHE_KEY = 'teams-tasks:react-query-cache'

const CACHE_VERSION = 'v1'

const WRITE_THROTTLE_MS = 1_000

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
    } catch {}
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
