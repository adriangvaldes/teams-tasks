import { useEffect, useState } from 'react'

/**
 * Atrasa a propagação de um valor.
 *
 * Usado na busca: sem isso, cada tecla vira uma query key nova e um request.
 * Com 350 ms, digitar "pipeline" dispara uma requisição em vez de oito.
 */
export function useDebouncedValue<TValue>(
  value: TValue,
  delayMs = 350,
): TValue {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
