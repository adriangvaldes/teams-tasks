import type { TaskListFilters } from './tasks.api'
import type { TeamListFilters } from './teams.api'

/**
 * Chaves de cache centralizadas.
 *
 * O motivo de não espalhar arrays literais pelos hooks é a invalidação: como
 * toda chave de tarefa começa com ['tasks'], uma mutação invalida
 * queryKeys.tasks.all e TODAS as listas (global, por time, filtradas) são
 * revalidadas de uma vez — sem precisar saber quais filtros estão montados na
 * tela naquele momento.
 *
 * `lists` e `options` são namespaces separados de propósito: as listagens
 * paginadas guardam InfiniteData (páginas), enquanto `options` guarda uma
 * página única para o seletor de times. Formatos diferentes sob chaves
 * diferentes evitam que uma escrita otimista tropece na estrutura errada.
 */
export const queryKeys = {
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    list: (filters: TeamListFilters) =>
      [...queryKeys.teams.lists(), filters] as const,
    /** Lista achatada usada pelo seletor de times do formulário de tarefa. */
    options: () => [...queryKeys.teams.all, 'options'] as const,
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
