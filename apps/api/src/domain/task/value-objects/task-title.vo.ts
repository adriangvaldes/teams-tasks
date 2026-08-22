import { InvalidTaskTitleError } from '../errors/task-errors'

const MIN_LENGTH = 3
const MAX_LENGTH = 120

export class TaskTitle {
  private constructor(private readonly _value: string) {}

  static create(value: string): TaskTitle {
    const normalized = value.trim().replace(/\s+/g, ' ')

    if (normalized.length < MIN_LENGTH) {
      throw new InvalidTaskTitleError(
        `Título deve ter ao menos ${MIN_LENGTH} caracteres`,
      )
    }

    if (normalized.length > MAX_LENGTH) {
      throw new InvalidTaskTitleError(
        `Título deve ter no máximo ${MAX_LENGTH} caracteres`,
      )
    }

    return new TaskTitle(normalized)
  }

  get value(): string {
    return this._value
  }

  equals(other: TaskTitle): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
