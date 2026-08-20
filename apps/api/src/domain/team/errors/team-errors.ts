import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/domain-errors'

export class InvalidTeamNameError extends ValidationError {
  constructor(message: string) {
    super(message, [{ path: 'name', message }])
  }
}

export class InvalidColorHexError extends ValidationError {
  constructor(received: string) {
    const message = 'Cor deve estar no formato hexadecimal #RRGGBB'
    super(`"${received}" é inválido. ${message}`, [
      { path: 'colorHex', message },
    ])
  }
}

export class InvalidTeamDescriptionError extends ValidationError {
  constructor(maxLength: number) {
    const message = `Descrição deve ter no máximo ${maxLength} caracteres`
    super(message, [{ path: 'description', message }])
  }
}

export class TeamNotFoundError extends NotFoundError {
  constructor(teamId: string) {
    super(`Time ${teamId} não encontrado`)
  }
}

export class TeamsNotFoundError extends NotFoundError {
  constructor(teamIds: string[]) {
    super(`Time(s) não encontrado(s): ${teamIds.join(', ')}`, [
      { path: 'teamIds', message: 'Um ou mais times informados não existem' },
    ])
  }
}

export class TeamNameAlreadyInUseError extends ConflictError {
  constructor(name: string) {
    const message = `Já existe um time chamado "${name}"`
    super(message, [{ path: 'name', message }])
  }
}
