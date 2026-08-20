import { Entity } from '../shared/entity'
import { UniqueEntityId } from '../shared/unique-entity-id'
import {
  DuplicateTeamAssignmentError,
  InvalidDueDateError,
  InvalidTaskDescriptionError,
} from './errors/task-errors'
import { TaskStatus } from './value-objects/task-status.vo'
import { TaskTitle } from './value-objects/task-title.vo'

const MAX_DESCRIPTION_LENGTH = 2000

export interface TaskProps {
  title: TaskTitle
  description: string | null
  status: TaskStatus
  dueDate: Date | null
  /** Uma tarefa pode pertencer a ZERO ou mais times (enunciado). */
  teamIds: UniqueEntityId[]
  createdAt: Date
  updatedAt: Date
}

export interface NewTaskProps {
  title: string
  description?: string | null
  status?: string
  dueDate?: string | Date | null
  teamIds?: string[]
}

export class Task extends Entity<TaskProps> {
  static create(props: NewTaskProps, id: UniqueEntityId, now: Date): Task {
    return new Task(
      {
        title: TaskTitle.create(props.title),
        description: Task.normalizeDescription(props.description),
        status: props.status
          ? TaskStatus.create(props.status)
          : TaskStatus.pending(),
        dueDate: Task.normalizeDueDate(props.dueDate),
        teamIds: Task.normalizeTeamIds(props.teamIds ?? []),
        createdAt: now,
        updatedAt: now,
      },
      id,
    )
  }

  /** Reidrata uma tarefa ja persistida. Usado exclusivamente pelos mappers. */
  static reconstitute(props: TaskProps, id: UniqueEntityId): Task {
    return new Task(props, id)
  }

  private static normalizeDescription(
    description: string | null | undefined,
  ): string | null {
    if (description === null || description === undefined) return null

    const normalized = description.trim()
    if (normalized.length === 0) return null

    if (normalized.length > MAX_DESCRIPTION_LENGTH) {
      throw new InvalidTaskDescriptionError(MAX_DESCRIPTION_LENGTH)
    }

    return normalized
  }

  private static normalizeDueDate(
    dueDate: string | Date | null | undefined,
  ): Date | null {
    if (dueDate === null || dueDate === undefined) return null

    const parsed = dueDate instanceof Date ? dueDate : new Date(dueDate)

    if (Number.isNaN(parsed.getTime())) {
      throw new InvalidDueDateError(String(dueDate))
    }

    return parsed
  }

  private static normalizeTeamIds(teamIds: string[]): UniqueEntityId[] {
    const ids = teamIds.map((teamId) => UniqueEntityId.create(teamId))
    const unique = new Set(ids.map((id) => id.value))

    if (unique.size !== ids.length) {
      throw new DuplicateTeamAssignmentError()
    }

    return ids
  }

  get title(): TaskTitle {
    return this.props.title
  }

  get description(): string | null {
    return this.props.description
  }

  get status(): TaskStatus {
    return this.props.status
  }

  get dueDate(): Date | null {
    return this.props.dueDate
  }

  /** Copia defensiva: a colecao so muda pelos metodos de intencao da entidade. */
  get teamIds(): readonly UniqueEntityId[] {
    return [...this.props.teamIds]
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /** Usado pela UI para destacar tarefas atrasadas. `now` vem da porta Clock. */
  isOverdue(now: Date): boolean {
    if (!this.props.dueDate) return false
    if (this.props.status.isDone()) return false
    return this.props.dueDate.getTime() < now.getTime()
  }

  changeTitle(title: string, now: Date): void {
    this.props.title = TaskTitle.create(title)
    this.touch(now)
  }

  changeDescription(description: string | null | undefined, now: Date): void {
    this.props.description = Task.normalizeDescription(description)
    this.touch(now)
  }

  changeStatus(status: string, now: Date): void {
    const next = TaskStatus.create(status)

    // Idempotente de proposito: a acao rapida da UI pode reenviar o mesmo
    // status (ex.: duplo toque) sem que isso conte como uma alteracao.
    if (next.equals(this.props.status)) return

    this.props.status = next
    this.touch(now)
  }

  changeDueDate(dueDate: string | Date | null | undefined, now: Date): void {
    this.props.dueDate = Task.normalizeDueDate(dueDate)
    this.touch(now)
  }

  /** Substitui o conjunto de times vinculados (semantica de PUT). */
  assignTeams(teamIds: string[], now: Date): void {
    this.props.teamIds = Task.normalizeTeamIds(teamIds)
    this.touch(now)
  }

  hasTeam(teamId: UniqueEntityId): boolean {
    return this.props.teamIds.some((id) => id.equals(teamId))
  }

  private touch(now: Date): void {
    this.props.updatedAt = now
  }
}
