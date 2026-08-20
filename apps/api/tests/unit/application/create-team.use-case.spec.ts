import { beforeEach, describe, expect, it } from 'vitest'
import { CreateTeam } from '../../../src/application/use-cases/team/create-team.use-case'
import {
  InvalidColorHexError,
  TeamNameAlreadyInUseError,
} from '../../../src/domain/team/errors/team-errors'
import { FixedClock } from '../../fakes/fixed-clock'
import { InMemoryTeamRepository } from '../../fakes/in-memory-team.repository'
import { SequentialIdGenerator } from '../../fakes/sequential-id-generator'

describe('CreateTeam', () => {
  let teamRepository: InMemoryTeamRepository
  let clock: FixedClock
  let useCase: CreateTeam

  beforeEach(() => {
    teamRepository = new InMemoryTeamRepository()
    clock = new FixedClock(new Date('2026-03-10T12:00:00.000Z'))
    useCase = new CreateTeam(teamRepository, new SequentialIdGenerator(), clock)
  })

  it('cria o time e devolve a saida ja normalizada', async () => {
    const output = await useCase.execute({
      name: '  Squad   Alpha ',
      colorHex: '#2563eb',
      description: 'Time de produto',
    })

    expect(output).toEqual({
      id: SequentialIdGenerator.at(1),
      name: 'Squad Alpha',
      colorHex: '#2563EB',
      description: 'Time de produto',
      taskCount: 0,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    })
  })

  it('persiste o time no repositorio', async () => {
    await useCase.execute({ name: 'Squad Alpha', colorHex: '#2563EB' })

    expect(teamRepository.items).toHaveLength(1)
  })

  it('rejeita nome duplicado ignorando diferenca de caixa', async () => {
    await useCase.execute({ name: 'Squad Alpha', colorHex: '#2563EB' })

    await expect(
      useCase.execute({ name: 'squad alpha', colorHex: '#DB2777' }),
    ).rejects.toThrow(TeamNameAlreadyInUseError)

    expect(teamRepository.items).toHaveLength(1)
  })

  it('nao toca no repositorio quando a entrada e invalida', async () => {
    await expect(
      useCase.execute({ name: 'Squad Alpha', colorHex: 'azul' }),
    ).rejects.toThrow(InvalidColorHexError)

    expect(teamRepository.items).toHaveLength(0)
  })

  it('usa o Clock injetado, e nao a hora real da maquina', async () => {
    const output = await useCase.execute({
      name: 'Plataforma',
      colorHex: '#059669',
    })

    expect(output.createdAt).toEqual(new Date('2026-03-10T12:00:00.000Z'))
  })
})
