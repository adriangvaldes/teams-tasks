import { randomUUID } from 'node:crypto'
import type { IdGenerator } from '../../application/ports/out/id-generator.port'
import { UniqueEntityId } from '../../domain/shared/unique-entity-id'

export class UuidIdGenerator implements IdGenerator {
  generate(): UniqueEntityId {
    return UniqueEntityId.create(randomUUID())
  }
}
