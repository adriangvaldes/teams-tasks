import {
  buildPaginationMeta,
  createTeamBodySchema,
  listTeamsQuerySchema,
  parseSort,
  updateTeamBodySchema,
} from '@teams-tasks/shared'
import type { RequestHandler } from 'express'
import type {
  CreateTeamUseCase,
  DeleteTeamUseCase,
  GetTeamUseCase,
  ListTeamsUseCase,
  UpdateTeamUseCase,
} from '../../../application/ports/in/team-use-cases.port'
import type { TeamSortField } from '../../../application/ports/out/team-repository.port'
import { createHandler } from '../create-handler'
import { TeamPresenter } from '../presenters/team.presenter'
import { idParamsSchema } from '../schemas/id-params.schema'

/**
 * Adapter de entrada HTTP para o agregado Team.
 *
 * Depende apenas das PORTAS de entrada (interfaces UseCase), nunca das classes
 * concretas: e o que permite testar o controller com dublês e o que torna o
 * transporte substituivel sem tocar em regra de negocio.
 */
export class TeamController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
  ) {}

  readonly list: RequestHandler = createHandler(
    { query: listTeamsQuerySchema },
    async ({ query }) => {
      const result = await this.listTeamsUseCase.execute({
        search: query.search,
        limit: query.limit,
        offset: query.offset,
        sort: parseSort<TeamSortField>(query.sort),
      })

      return {
        status: 200,
        body: {
          data: result.items.map(TeamPresenter.toDTO),
          meta: buildPaginationMeta(result.total, query),
        },
      }
    },
  )

  readonly getById: RequestHandler = createHandler(
    { params: idParamsSchema },
    async ({ params }) => {
      const team = await this.getTeamUseCase.execute({ teamId: params.id })

      return { status: 200, body: { data: TeamPresenter.toDTO(team) } }
    },
  )

  readonly create: RequestHandler = createHandler(
    { body: createTeamBodySchema },
    async ({ body }) => {
      const team = await this.createTeamUseCase.execute(body)

      return { status: 201, body: { data: TeamPresenter.toDTO(team) } }
    },
  )

  readonly update: RequestHandler = createHandler(
    { params: idParamsSchema, body: updateTeamBodySchema },
    async ({ params, body }) => {
      const team = await this.updateTeamUseCase.execute({
        teamId: params.id,
        ...body,
      })

      return { status: 200, body: { data: TeamPresenter.toDTO(team) } }
    },
  )

  readonly remove: RequestHandler = createHandler(
    { params: idParamsSchema },
    async ({ params }) => {
      await this.deleteTeamUseCase.execute({ teamId: params.id })

      return { status: 204 }
    },
  )
}
