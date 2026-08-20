import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'

/**
 * Porta de saida para geracao de identidade. O id nasce na aplicacao, nao no
 * banco: isso permite criar a entidade completa em memoria (e testa-la) antes
 * de qualquer I/O, e mantem o dominio independente da estrategia de id.
 */
export interface IdGenerator {
  generate(): UniqueEntityId
}
