import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'

export interface IdGenerator {
  generate(): UniqueEntityId
}
