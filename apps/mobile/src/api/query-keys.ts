import type { TaskListFilters } from './tasks.api'
import type { TeamListFilters } from './teams.api'

/**
 * Chaves de cache centralizadas.
 *
 * O motivo de nao espalhar arrays literais pelos hooks: invalidacao. Como toda
 * chave de tarefa comeca com ['tasks'], uma mutacao invalida
 * queryKeys.tasks.all e TODAS as listas (global, por time, filtradas) sao
 * revalidadas de uma vez - sem precisar saber quais filtros estao montados na
 * tela naquele momento.
 */
export const queryKeys = {
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    list: (filters: TeamListFilters) =>
      [...queryKeys.teams.lists(), filters] as const,
    details: () => [...queryKeys.teams.all, 'detail'] as const,
    detail: (teamId: string) => [...queryKeys.teams.details(), teamId] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskListFilters) =>
      [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (taskId: string) => [...queryKeys.tasks.details(), taskId] as const,
  },
} as const
