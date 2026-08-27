# 001 — Tasks

> Status: **current**

## Context

Task is the product's central entity: it has a title, a progress state, an
optional due date, and it can be linked to **zero or more** teams. The "zero" is
not an oversight in the model — it is the case of a task nobody has assigned
yet, and the system must be able to represent it without a workaround.

What this part deliberately does not do: there is no assignment to people, no
subtasks and no history of status changes.

## Rules

| # | Rule |
|---|---|
| TA-1 | The title is between 3 and 120 characters, measured **after** trimming the edges. |
| TA-2 | A whitespace-only title is invalid, not empty. |
| TA-3 | A task is born with status `PENDING` when no status is supplied. |
| TA-4 | The only statuses are `PENDING`, `IN_PROGRESS` and `DONE`. Any other value is rejected. |
| TA-5 | Re-sending the status a task already has is a no-op: `updatedAt` does **not** change. |
| TA-6 | `isOverdue` is true only when a due date exists, it is in the past, and the task is **not** done. |
| TA-7 | Completing an overdue task clears `isOverdue` — the UI reflects that immediately, without waiting for the server. |
| TA-8 | A task can have 0 to 20 teams, with no repetition. |
| TA-9 | Linking the same team twice in one request is a validation error, not silent deduplication. |
| TA-10 | An empty or whitespace-only description is normalised to `null`, never to `""`. |
| TA-11 | On update, an **absent** field preserves the current value; a field sent as `null` clears it. |
| TA-12 | Team existence is validated **before** any write: a task is never left half-updated. |
| TA-13 | `createdAt` and `updatedAt` come from the `Clock` port, never from a database `DEFAULT now()`. |
| TA-14 | The circle on a task card is binary: it completes a task, and completes it again into `PENDING`. It never produces `IN_PROGRESS`. |
| TA-15 | The three statuses are all reachable from the task's own screen, through the status selector. |

*On TA-5: idempotence exists because the UI has a quick status action in the
list. Without it, tapping the same chip twice would touch `updatedAt` and
reorder the list under the user's finger.*

*On TA-11: this is PATCH semantics applied to the PUT verb, and it is a
conscious choice — see [Edge cases](#edge-cases).*

*On TA-14: the control carries `accessibilityRole="checkbox"`, and a checkbox
promises two states. It used to cycle through three, so tapping a pending task's
empty circle moved it to `IN_PROGRESS` and left the circle empty — the tap
looked like it had failed, and a screen reader announced "not checked" after an
action that did not check it. Binary makes the control tell the truth.*

## Contracts

### Create

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Implementar tela de listagem",
  "description": "Lista global com filtros por time e status.",
  "status": "IN_PROGRESS",
  "dueDate": "2026-08-29T18:00:00.000Z",
  "teamIds": ["11111111-1111-4111-8111-111111111111"]
}
```

```json
{
  "data": {
    "id": "a830e08c-733e-472f-8d6f-d6d117ecab89",
    "title": "Implementar tela de listagem",
    "description": "Lista global com filtros por time e status.",
    "status": "IN_PROGRESS",
    "dueDate": "2026-08-29T18:00:00.000Z",
    "teams": [
      { "id": "11111111-…", "name": "Squad Alpha", "colorHex": "#2563EB" }
    ],
    "isOverdue": false,
    "createdAt": "2026-08-25T17:08:56.184Z",
    "updatedAt": "2026-08-25T17:08:56.184Z"
  }
}
```

The team summary (`id`, `name`, `colorHex`) is embedded in the task **on
purpose**: it is exactly what the UI needs to draw the colour chip without a
second request.

### Change status

```http
PATCH /api/tasks/:id/status
{ "status": "DONE" }
```

A separate endpoint from the general update because it is the product's most
frequent action and the only one with an optimistic update in the app — see
[004](004-offline-and-optimistic-updates.md).

### Errors

| Situation | HTTP | `code` |
|---|---|---|
| Title shorter than 3 characters | 400 | `VALIDATION_ERROR` |
| Status outside the enum | 400 | `VALIDATION_ERROR` |
| `dueDate` without a timezone offset | 400 | `VALIDATION_ERROR` |
| `id` that is not a UUID | 400 | `VALIDATION_ERROR` |
| Task does not exist | 404 | `NOT_FOUND` |
| `teamIds` referencing a missing team | 404 | `NOT_FOUND` |
| Empty body on update | 400 | `VALIDATION_ERROR` |

The error envelope always carries `details[].path` pointing at the offending
field, and that is what the form uses to highlight the right input.

## Edge cases

**`PUT` behaves like `PATCH`.** Sending `PUT /api/tasks/:id` with only
`{ "title": … }` **preserves** the teams and the other fields. Strict REST would
expect full replacement. The choice was deliberate: the app's form sends the
whole object anyway, and the permissive semantics stop a partial client from
wiping data by accident. The `PUT` verb stayed because that is what the
challenge brief suggests. If a second client ever appears, the right move is to
rename it to `PATCH` — not to change the behaviour.

**Completing from the list forgets `IN_PROGRESS`.** Reopening a completed task
sends it to `PENDING`, not back to whatever it was before. Restoring the prior
status would mean storing it somewhere, and the gain does not pay for the state:
the task's own screen sets any status directly.

**Deleting twice returns 404, not 204.** The second delete reports that there
was nothing to delete instead of pretending it succeeded.

**`dueDate` requires ISO 8601 with an offset.** `"2026-12-01"` is rejected. The
app accepts `dd/mm/yyyy` on screen and converts it to noon UTC before sending —
noon rather than midnight, so the date stays the same in any timezone within
±12 h.

**`isOverdue` is computed on the server.** The device clock plays no part in the
decision. The textual label ("Vence amanhã") is computed on the client, so a
wrong clock on the device misaligns the label, never the data.

**What is not validated:** that the due date is in the future. Registering an
already-overdue task is legitimate — it is how you record something that
slipped.

## Traceability

| Rule | Test |
|---|---|
| TA-1 | `apps/api/tests/unit/domain/task.entity.spec.ts` → `"rejeita titulo com menos de 3 caracteres (requisito de aceitacao)"`, `"aceita titulo com exatamente 3 caracteres"` |
| TA-2 | `task.entity.spec.ts` → `"rejeita titulo que só tem espacos"` |
| TA-3 | `task.entity.spec.ts` → `"nasce como PENDING quando o status nao e informado"` |
| TA-4 | `task.entity.spec.ts` → `"rejeita status desconhecido"` |
| TA-5 | `task.entity.spec.ts` → `"e idempotente: reenviar o mesmo status nao mexe em updatedAt"` |
| TA-6 | `task.entity.spec.ts` → `"e verdadeiro quando o prazo passou e a tarefa nao esta concluida"`, `"e falso quando a tarefa nao tem prazo"` |
| TA-7 | `task.entity.spec.ts` → `"e falso quando a tarefa esta concluida, mesmo com prazo vencido"`; client side in `apps/mobile/tests/hooks/use-tasks.test.tsx` |
| TA-8 | `task.entity.spec.ts` → `"nasce sem nenhum time, o que o dominio permite"`, `"permite remover todos os times"` |
| TA-9 | `task.entity.spec.ts` → `"rejeita o mesmo time repetido na mesma tarefa"` |
| TA-10 | pending — covered indirectly by `create-task.use-case.spec.ts` |
| TA-11 | `apps/api/tests/unit/application/update-task.use-case.spec.ts` → `"campo ausente (undefined) preserva o valor atual"`, `"null limpa o campo explicitamente"` |
| TA-12 | `update-task.use-case.spec.ts` → `"valida a existencia dos times ANTES de aplicar qualquer mudanca"` |
| TA-13 | `apps/api/tests/integration/tasks.routes.spec.ts` (deterministic timestamps via the test `Clock`) |
| TA-14 | `apps/mobile/tests/lib/task-status.test.ts` → `"e binario: dois toques voltam ao ponto de partida"`, `"nunca devolve IN_PROGRESS, que so existe no seletor do detalhe"` |
| TA-15 | pending — the selector on the task screen has no test of its own |
