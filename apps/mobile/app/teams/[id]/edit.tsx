import { useLocalSearchParams, useRouter } from 'expo-router'
import { ApiError } from '@/api/api-error'
import { TeamForm } from '@/components/team-form'
import { FormScreen } from '@/components/ui/form-screen'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { type TeamFormValues, toTeamBody } from '@/forms/team-form.schema'
import { useTeam, useUpdateTeam } from '@/hooks/use-teams'

export default function EditTeamScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const query = useTeam(id)
  const updateTeam = useUpdateTeam(id)

  if (query.isPending) return <LoadingState label="Carregando time…" />

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof ApiError
            ? query.error.userMessage
            : 'Erro inesperado ao carregar o time.'
        }
        onRetry={() => void query.refetch()}
      />
    )
  }

  const team = query.data.data

  const defaultValues: TeamFormValues = {
    name: team.name,
    colorHex: team.colorHex,
    description: team.description ?? '',
  }

  return (
    <FormScreen>
      <TeamForm
        defaultValues={defaultValues}
        submitLabel="Salvar"
        isSubmitting={updateTeam.isPending}
        submitError={updateTeam.error}
        onSubmit={(values) => {
          updateTeam.mutate(toTeamBody(values), {
            onSuccess: () => router.back(),
          })
        }}
        onCancel={() => router.back()}
      />
    </FormScreen>
  )
}
