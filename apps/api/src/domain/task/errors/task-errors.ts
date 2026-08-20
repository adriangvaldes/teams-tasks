import { NotFoundError, ValidationError } from '../../shared/domain-errors'

export class InvalidTaskTitleError extends ValidationError {
  constructor(message: string) {
    super(message, [{ path: 'title', message }])
  }
}

export class InvalidTaskDescriptionError extends ValidationError {
  constructor(maxLength: number) {
    const message = `Descrição deve ter no máximo ${maxLength} caracteres`
    super(message, [{ path: 'description', message }])
  }
}

export class InvalidTaskStatusError extends ValidationError {
  constructor(received: string, allowed: readonly string[]) {
    const message = `Status deve ser um de: ${allowed.join(', ')}`
    super(`"${received}" é um status inválido. ${message}`, [
      { path: 'status', message },
    ])
  }
}

export class InvalidDueDateError extends ValidationError {
  constructor(received: string) {
    const message = 'Data de vencimento deve ser uma data válida'
    super(`"${received}" é inválido. ${message}`, [
      { path: 'dueDate', message },
    ])
  }
}

export class DuplicateTeamAssignmentError extends ValidationError {
  constructor() {
    const message = 'Não repita o mesmo time na mesma tarefa'
    super(message, [{ path: 'teamIds', message }])
  }
}

export class TaskNotFoundError extends NotFoundError {
  constructor(taskId: string) {
    super(`Tarefa ${taskId} não encontrada`)
  }
}
