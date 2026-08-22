import { InvalidUuidError } from './domain-errors'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class UniqueEntityId {
  private constructor(private readonly _value: string) {}

  static create(value: string): UniqueEntityId {
    const normalized = value.trim().toLowerCase()

    if (!UUID_PATTERN.test(normalized)) {
      throw new InvalidUuidError(value)
    }

    return new UniqueEntityId(normalized)
  }

  get value(): string {
    return this._value
  }

  equals(other: UniqueEntityId): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
