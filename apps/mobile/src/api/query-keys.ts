import type { TaskListFilters } from './tasks.api'
import type { TeamListFilters } from './teams.api'

export const queryKeys = {
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    list: (filters: TeamListFilters) =>
      [...queryKeys.teams.lists(), filters] as const,

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
