import type { Clock } from '../../application/ports/out/clock.port'

/**
 * Adapter de saida da porta Clock. E o UNICO ponto do backend que chama
 * `new Date()`; qualquer outra camada recebe o tempo por injecao.
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
