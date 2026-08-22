import { InvalidTaskStatusError } from '../errors/task-errors'

export const TASK_STATUS_VALUES = ['PENDING', 'IN_PROGRESS', 'DONE'] as const

export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number]

export class TaskStatus {
  private constructor(private readonly _value: TaskStatusValue) {}

  static create(value: string): TaskStatus {
    const normalized = value.trim().toUpperCase()

    if (!TaskStatus.isValid(normalized)) {
      throw new InvalidTaskStatusError(value, TASK_STATUS_VALUES)
    }

    return new TaskStatus(normalized)
  }

  static pending(): TaskStatus {
    return new TaskStatus('PENDING')
  }

  private static isValid(value: string): value is TaskStatusValue {
    return (TASK_STATUS_VALUES as readonly string[]).includes(value)
  }

  get value(): TaskStatusValue {
    return this._value
  }

  isDone(): boolean {
    return this._value === 'DONE'
  }

  equals(other: TaskStatus): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
