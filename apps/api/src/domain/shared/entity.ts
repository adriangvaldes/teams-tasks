import type { UniqueEntityId } from './unique-entity-id'

export abstract class Entity<TProps> {
  protected constructor(
    protected props: TProps,
    private readonly _id: UniqueEntityId,
  ) {}

  get id(): UniqueEntityId {
    return this._id
  }

  equals(other?: Entity<TProps>): boolean {
    if (!other) return false
    if (other === this) return true
    return this._id.equals(other._id)
  }
}
