import { useLocalSearchParams, useRouter } from 'expo-router'
import { ApiError } from '@/api/api-error'
import { TaskForm } from '@/components/task-form'
import { FormScreen } from '@/components/ui/form-screen'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { type TaskFormValues, toTaskBody } from '@/forms/task-form.schema'
import { useTask, useUpdateTask } from '@/hooks/use-tasks'
import { formatDateInput } from '@/lib/format'

export default function EditTaskScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const query = useTask(id)
  const updateTask = useUpdateTask(id)

  if (query.isPending) return <LoadingState label="Carregando tarefa…" />

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof ApiError
            ? query.error.userMessage
            : 'Erro inesperado ao carregar a tarefa.'
        }
        onRetry={() => void query.refetch()}
      />
    )
  }

  const task = query.data.data

  // Caminho inverso do toTaskBody: o DTO fala ISO e null, o formulário fala
  // dd/mm/aaaa e string vazia.
  const defaultValues: TaskFormValues = {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    dueDate: task.dueDate ? formatDateInput(task.dueDate) : '',
    teamIds: task.teams.map((team) => team.id),
  }

  return (
    <FormScreen>
      <TaskForm
        defaultValues={defaultValues}
        submitLabel="Salvar"
        isSubmitting={updateTask.isPending}
        submitError={updateTask.error}
        onSubmit={(values) => {
          updateTask.mutate(toTaskBody(values), {
            onSuccess: () => router.back(),
          })
        }}
        onCancel={() => router.back()}
      />
    </FormScreen>
  )
}
