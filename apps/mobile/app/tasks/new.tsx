import { useLocalSearchParams, useRouter } from 'expo-router'
import { TaskForm } from '@/components/task-form'
import { FormScreen } from '@/components/ui/form-screen'
import { EMPTY_TASK_FORM, toTaskBody } from '@/forms/task-form.schema'
import { useCreateTask } from '@/hooks/use-tasks'

export default function NewTaskScreen() {
  const router = useRouter()

  // Ao criar a tarefa a partir da tela de um time, ele já vem selecionado -
  // o usuário não precisa procurá-lo no seletor.
  const { teamId } = useLocalSearchParams<{ teamId?: string }>()

  const createTask = useCreateTask()

  return (
    <FormScreen>
      <TaskForm
        defaultValues={{
          ...EMPTY_TASK_FORM,
          teamIds: teamId ? [teamId] : [],
        }}
        submitLabel="Criar tarefa"
        isSubmitting={createTask.isPending}
        submitError={createTask.error}
        onSubmit={(values) => {
          createTask.mutate(toTaskBody(values), {
            onSuccess: () => router.back(),
          })
        }}
        onCancel={() => router.back()}
      />
    </FormScreen>
  )
}
