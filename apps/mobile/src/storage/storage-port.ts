/**
 * Porta de armazenamento chave-valor.
 *
 * Existe pelo mesmo motivo das portas do backend: o MMKV e um modulo NATIVO e
 * nao roda no Expo Go. Em vez de escolher entre "offline-first" e "o avaliador
 * roda com um comando", a abstracao permite as duas coisas - MMKV quando ha
 * dev client, AsyncStorage quando nao ha.
 *
 * A interface e assincrona mesmo que o MMKV seja sincrono: adaptar sincrono
 * para assincrono e trivial, o contrario nao e.
 */
export interface StoragePort {
  /** Identifica a implementacao ativa, util para diagnostico na UI. */
  readonly name: 'mmkv' | 'async-storage'
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}
