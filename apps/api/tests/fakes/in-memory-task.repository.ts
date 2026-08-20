import type { PaginatedResult } from '../../src/application/dtos/pagination.dto'
import type {
  ListTasksCriteria,
  TaskRepository,
} from '../../src/application/ports/out/task-repository.port'
import type { Task } from '../../src/domain/task/task.entity'
import type { UniqueEntityId } from '../../src/domain/shared/unique-entity-id'

export class InMemoryTaskRepository implements TaskRepository {
  readonly items: Task[] = []

  async findById(id: UniqueEntityId): Promise<Task | null> {
    return this.items.find((task) => task.id.equals(id)) ?? null
  }

  async list(criteria: ListTasksCriteria): Promise<PaginatedResult<Task>> {
    let result = [...this.items]

    if (criteria.status) {
      const status = criteria.status

      result = result.filter((task) => task.status.equals(status))
    }

    if (criteria.teamId) {
      const teamId = criteria.teamId

      result = result.filter((task) => task.hasTeam(teamId))
    }

    if (criteria.search) {
      const term = criteria.search.toLowerCase()

      result = result.filter(
        (task) =>
          task.title.value.toLowerCase().includes(term) ||
          (task.description?.toLowerCase().includes(term) ?? false),
      )
    }

    result.sort((a, b) => this.compare(a, b, criteria))

    return {
      items: result.slice(criteria.offset, criteria.offset + criteria.limit),
      total: result.length,
    }
  }

  async countByTeamIds(
    teamIds: readonly UniqueEntityId[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>()

    for (const teamId of teamIds) {
      const total = this.items.filter((task) => task.hasTeam(teamId)).length

      if (total > 0) counts.set(teamId.value, total)
    }

    return counts
  }

  async create(task: Task): Promise<void> {
    this.items.push(task)
  }

  async update(task: Task): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(task.id))

    if (index >= 0) this.items[index] = task
  }

  async delete(id: UniqueEntityId): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(id))

    if (index >= 0) this.items.splice(index, 1)
  }

  private compare(a: Task, b: Task, criteria: ListTasksCriteria): number {
    const direction = criteria.sort.direction === 'asc' ? 1 : -1

    switch (criteria.sort.field) {
      case 'title':
        return a.title.value.localeCompare(b.title.value) * direction

      case 'status':
        return a.status.value.localeCompare(b.status.value) * direction

      case 'dueDate': {
        // Espelha o adapter Prisma: nulos sempre por ultimo, independente da
        // direcao. Se o fake divergisse aqui, o teste unitario passaria e o
        // comportamento real seria outro.
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1

        return (a.dueDate.getTime() - b.dueDate.getTime()) * direction
      }

      default:
        return (a.createdAt.getTime() - b.createdAt.getTime()) * direction
    }
  }
}
