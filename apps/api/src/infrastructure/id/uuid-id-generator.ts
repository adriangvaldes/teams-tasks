import { randomUUID } from 'node:crypto'
import type { IdGenerator } from '../../application/ports/out/id-generator.port'
import { UniqueEntityId } from '../../domain/shared/unique-entity-id'

/** Adapter de saida da porta IdGenerator usando UUID v4 do proprio Node. */
export class UuidIdGenerator implements IdGenerator {
  generate(): UniqueEntityId {
    return UniqueEntityId.create(randomUUID())
  }
}
