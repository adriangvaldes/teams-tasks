import type { Clock } from '../../src/application/ports/out/clock.port'

/**
 * Clock deterministico. Existe porque a porta Clock foi declarada na camada de
 * aplicacao: nenhum caso de uso chama `new Date()`, entao o teste controla o
 * tempo e pode afirmar timestamps exatos e regras como isOverdue.
 */
export class FixedClock implements Clock {
  constructor(private current: Date = new Date('2026-03-10T12:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current)
  }

  advanceBy(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds)
  }

  set(date: Date): void {
    this.current = new Date(date)
  }
}
