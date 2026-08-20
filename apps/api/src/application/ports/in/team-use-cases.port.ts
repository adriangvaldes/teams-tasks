import type { PaginatedOutput } from '../../dtos/pagination.dto'
import type {
  CreateTeamInput,
  DeleteTeamInput,
  GetTeamInput,
  ListTeamsInput,
  TeamOutput,
  UpdateTeamInput,
} from '../../dtos/team.dto'
import type { UseCase } from './use-case.port'

export type CreateTeamUseCase = UseCase<CreateTeamInput, TeamOutput>
export type UpdateTeamUseCase = UseCase<UpdateTeamInput, TeamOutput>
export type GetTeamUseCase = UseCase<GetTeamInput, TeamOutput>
export type DeleteTeamUseCase = UseCase<DeleteTeamInput, void>
export type ListTeamsUseCase = UseCase<
  ListTeamsInput,
  PaginatedOutput<TeamOutput>
>
