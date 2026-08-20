import { InvalidTeamNameError } from '../errors/team-errors'

const MIN_LENGTH = 2
const MAX_LENGTH = 60

export class TeamName {
  private constructor(private readonly _value: string) {}

  static create(value: string): TeamName {
    const normalized = value.trim().replace(/\s+/g, ' ')

    if (normalized.length < MIN_LENGTH) {
      throw new InvalidTeamNameError(
        `Nome do time deve ter ao menos ${MIN_LENGTH} caracteres`,
      )
    }

    if (normalized.length > MAX_LENGTH) {
      throw new InvalidTeamNameError(
        `Nome do time deve ter no máximo ${MAX_LENGTH} caracteres`,
      )
    }

    return new TeamName(normalized)
  }

  get value(): string {
    return this._value
  }

  equals(other: TeamName): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase()
  }

  toString(): string {
    return this._value
  }
}
