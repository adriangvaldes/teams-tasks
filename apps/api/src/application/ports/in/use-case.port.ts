/**
 * Porta de ENTRADA generica. Os adapters (controllers HTTP, um comando CLI, um
 * consumer de fila) dependem desta abstracao - nunca da classe concreta.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}
