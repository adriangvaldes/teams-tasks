import { useRouter } from 'expo-router'
import { TeamForm } from '@/components/team-form'
import { FormScreen } from '@/components/ui/form-screen'
import { toTeamBody } from '@/forms/team-form.schema'
import { useCreateTeam } from '@/hooks/use-teams'

export default function NewTeamScreen() {
  const router = useRouter()
  const createTeam = useCreateTeam()

  return (
    <FormScreen>
      <TeamForm
        submitLabel="Criar time"
        isSubmitting={createTeam.isPending}
        submitError={createTeam.error}
        onSubmit={(values) => {
          createTeam.mutate(toTeamBody(values), {
            onSuccess: () => router.back(),
          })
        }}
        onCancel={() => router.back()}
      />
    </FormScreen>
  )
}
