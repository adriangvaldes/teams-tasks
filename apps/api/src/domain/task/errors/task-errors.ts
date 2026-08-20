import { NotFoundError, ValidationError } from '../../shared/domain-errors'

export class InvalidTaskTitleError extends ValidationError {
  constructor(message: string) {
    super(message, [{ path: 'title', message }])
  }
}

export class InvalidTaskDescriptionError extends ValidationError {
  constructor(maxLength: number) {
    const message = `Descricao deve ter no maximo ${maxLength} caracteres`
    super(message, [{ path: 'description', message }])
  }
}

export class InvalidTaskStatusError extends ValidationError {
  constructor(received: string, allowed: readonly string[]) {
    const message = `Status deve ser um de: ${allowed.join(', ')}`
    super(`"${received}" e um status invalido. ${message}`, [
      { path: 'status', message },
    ])
  }
}

export class InvalidDueDateError extends ValidationError {
  constructor(received: string) {
    const message = 'Data de vencimento deve ser uma data valida'
    super(`"${received}" e invalido. ${message}`, [
      { path: 'dueDate', message },
    ])
  }
}

export class DuplicateTeamAssignmentError extends ValidationError {
  constructor() {
    const message = 'Nao repita o mesmo time na mesma tarefa'
    super(message, [{ path: 'teamIds', message }])
  }
}

export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: string) {
    super(`Tarefa ${taskId} nao encontrada`)
  }
}
