# 004 — Cache, optimistic updates and offline

> Status: **current**

## Context

The app is used on unreliable mobile networks. Two decisions follow from that:
whatever has already loaded stays visible after closing the app, and the most
frequent action — changing a task's status — responds immediately, without
waiting for the server.

Optimism without a rollback is a lie told to the user. So every optimistic
update here has its way back written down and tested.

## Rules

| # | Rule |
|---|---|
| OF-1 | The React Query cache is persisted to disk and restored when the app opens. |
| OF-2 | Storage uses MMKV when available and falls back to `AsyncStorage` when not — the choice is made behind a `StoragePort` and no screen knows which one is in use. |
| OF-3 | The persisted cache is versioned. A version other than the current one is discarded, not migrated. |
| OF-4 | Writes to disk are throttled at 1 s. |
| OF-5 | Changing status updates the list and the detail **before** the server responds. |
| OF-6 | The optimistic update recomputes `isOverdue`: completing an overdue task removes the overdue highlight immediately. |
| OF-7 | If a task stops matching a list's status filter, it is **removed** from that list and that list's `meta.total` is decremented. With several statuses selected, it stays as long as its new status is one of them. |
| OF-8 | Deleting a task removes it from the list before the response, adjusting the total. |
| OF-9 | Any failure restores the snapshot taken before the mutation — lists and detail return to their previous state. |
| OF-10 | On settle, success or error, task and team queries are invalidated: the server has the final word. |
| OF-11 | A 4xx error is **not** retried. A network error or 5xx is retried up to 2 times. |
| OF-12 | Mutations are never retried automatically. |
| OF-13 | Cache keys are hierarchical, so invalidating an upper level reaches everything below it. |

*On OF-7: without this, marking a task done in the "Pending" tab would leave it
visible in the wrong list until the next revalidation — the user would watch
their own filter being ignored.*

*On OF-11: retrying a 400 is guaranteed waste. The body is already wrong; the
second attempt fails too, and the user only waits longer.*

*On OF-12: retrying a create can duplicate the resource. The decision to try
again belongs to the user, not to the HTTP client.*

## Contracts

### Key hierarchy

```
tasks.all                       ← invalidates everything task-related
  tasks.lists()                 ← invalidates every listing
    tasks.list(filters)         ← one specific listing
  tasks.detail(id)              ← one detail

teams.all
  teams.lists()
  teams.options()               ← deliberately outside lists()
  teams.detail(id)
```

`teams.options()` is separate because it feeds the form's team picker, which
should not be invalidated every time the team listing changes page.

### Lifecycle of a status change

```
onMutate   cancelQueries(tasks.all)
           snapshot ← getQueriesData(tasks.all)
           patch the lists  (status, isOverdue, removal if the filter no longer matches)
           patch the detail
onError    restore the whole snapshot
onSettled  invalidate(tasks.all) + invalidate(teams.all)
```

`cancelQueries` comes first for a reason: without it, an in-flight request can
resolve after the optimistic patch and overwrite the UI with stale data.

## Edge cases

**MMKV does not run in Expo Go.** It is a native module. That is why
`StoragePort` exists: the MMKV adapter writes and removes a probe key inside a
`try/catch` and, if that fails, the app uses `AsyncStorage`. `pnpm dev:mobile`
works with no custom build.

**Writing to disk can fail silently.** `flush` swallows the error on purpose:
failing to persist the cache must not take down the screen. The accepted
consequence is that the cache may be older than expected after a crash.

**The total is decremented on every loaded page.** The UI reads the total from
the first page, so the displayed number is correct. It is a known cache
inconsistency, not a visible bug — and it disappears on the `onSettled`
invalidation.

**Concurrent mutations.** The "saving" indicator in the list compares against
`changeStatus.variables?.taskId`, which reflects the latest mutation. Two
simultaneous changes on different tasks show the spinner only on the last one.
The data stays correct; it is the visual feedback that is approximate.

**Real offline has a limit.** The app shows what it already loaded and rolls
back mutations that failed. It does **not** queue mutations to resend when the
network returns. An offline queue is a different feature, requiring idempotency
on the server, and it was deliberately left out.

## Traceability

| Rule | Test |
|---|---|
| OF-1 | pending |
| OF-2 | pending |
| OF-3 | pending |
| OF-4 | pending |
| OF-5 | `apps/mobile/tests/hooks/use-tasks.test.tsx` → `"atualiza a lista ANTES da resposta do servidor"` |
| OF-6 | `use-tasks.test.tsx` → `"recalcula isOverdue: tarefa concluida nao esta atrasada"` |
| OF-7 | `use-tasks.test.tsx` → `"remove a tarefa da lista filtrada que ela deixou de casar"`, `"mantem a tarefa quando o novo status ainda casa com a lista de filtros"` |
| OF-8 | `use-tasks.test.tsx` → `"remove da lista e ajusta o total antes da resposta"` |
| OF-9 | `use-tasks.test.tsx` → `"desfaz a alteracao quando a requisicao falha"`, `"recoloca a tarefa na lista quando a exclusao falha"` |
| OF-10 | pending |
| OF-11 | `apps/mobile/tests/api/http-client.test.ts`, `api-error.test.ts` |
| OF-12 | pending |
| OF-13 | covered indirectly by `use-tasks.test.tsx` → `"atualiza tambem o detalhe em cache"` |

The `pending` rows OF-1 to OF-4 are the project's largest test gap: the cache
persistence layer has no test of its own. It is the first debt to pay.
