import type { IdGenerator } from '../../src/application/ports/out/id-generator.port'
import { UniqueEntityId } from '../../src/domain/shared/unique-entity-id'

/**
 * Gera UUIDs validos e previsiveis (o primeiro sempre termina em ...0001).
 * Permite asserts diretos sobre o id retornado, sem capturar o valor gerado.
 */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0

  generate(): UniqueEntityId {
    this.counter += 1

    return UniqueEntityId.create(SequentialIdGenerator.at(this.counter))
  }

  /** Qual id a n-esima chamada produz. Util para montar expectativas. */
  static at(sequence: number): string {
    const hex = sequence.toString(16).padStart(12, '0')

    return `00000000-0000-4000-8000-${hex}`
  }
}
