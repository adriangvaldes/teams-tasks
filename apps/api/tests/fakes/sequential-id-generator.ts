import type { IdGenerator } from '../../src/application/ports/out/id-generator.port'
import { UniqueEntityId } from '../../src/domain/shared/unique-entity-id'

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0

  generate(): UniqueEntityId {
    this.counter += 1

    return UniqueEntityId.create(SequentialIdGenerator.at(this.counter))
  }

  static at(sequence: number): string {
    const hex = sequence.toString(16).padStart(12, '0')

    return `00000000-0000-4000-8000-${hex}`
  }
}
