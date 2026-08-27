# 002 — Teams

> Status: **current**

## Context

A team is a grouping with a visual identity. It exists for two purposes: to give
tasks a slice to be filtered by, and to give the user a colour they recognise at
a glance in the list.

Because colour is the main visual signal, the contrast of text over it cannot be
left to chance — it is a rule, not styling.

## Rules

| # | Rule |
|---|---|
| TE-1 | The name is between 2 and 60 characters and is normalised: edges trimmed, repeated inner whitespace collapsed to one space. |
| TE-2 | The name is unique **ignoring case**: with "Squad Alpha" present, creating "squad alpha" is a conflict. |
| TE-3 | The colour is required, in `#RRGGBB` format, and is always stored uppercase. |
| TE-4 | An empty or whitespace-only description becomes `null`. Limit of 500 characters. |
| TE-5 | Listing teams returns each team's `taskCount`. |
| TE-6 | `taskCount` for every team on the page is resolved in **one** query, never one per team. |
| TE-7 | Deleting a team removes the links, **not** the tasks. A task left with no team still exists. |
| TE-8 | The team colour appears as a chip on tasks, and the chip's text colour is chosen by computed contrast, not hardcoded. |
| TE-9 | `createdAt` and `updatedAt` come from the `Clock` port. |

*On TE-2: uniqueness is checked in the use case, ignoring case, and there is
also a `UNIQUE` constraint in the database. The constraint is the safety net for
a race between two simultaneous requests; the use-case check is what produces a
readable error message.*

*On TE-8: the calculation is WCAG relative luminance with sRGB gamma correction
and a threshold of 0.45. Without it, a team with a light colour would get
unreadable white text.*

## Contracts

### Create

```http
POST /api/teams
Content-Type: application/json

{ "name": "Squad Alpha", "colorHex": "#2563eb", "description": "Time de produto" }
```

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Squad Alpha",
    "colorHex": "#2563EB",
    "description": "Time de produto",
    "taskCount": 0,
    "createdAt": "2026-08-25T17:07:41.078Z",
    "updatedAt": "2026-08-25T17:07:41.078Z"
  }
}
```

The colour went in lowercase and came out uppercase: normalisation is part of
the contract, not an implementation detail.

### List

```http
GET /api/teams?search=squad&sort=name:asc&limit=20&offset=0
```

```json
{
  "data": [ { "…": "…", "taskCount": 4 } ],
  "meta": { "total": 3, "limit": 20, "offset": 0, "hasMore": false }
}
```

### Errors

| Situation | HTTP | `code` |
|---|---|---|
| Name shorter than 2 characters | 400 | `VALIDATION_ERROR` |
| Colour outside `#RRGGBB` | 400 | `VALIDATION_ERROR` |
| Name already in use (any case) | 409 | `CONFLICT` |
| Team does not exist | 404 | `NOT_FOUND` |

## Edge cases

**Deleting a team is safe by design.** The `ON DELETE CASCADE` sits only on the
`task_teams` link table. The task survives and simply ends up with an empty team
list — a valid state under rule TA-8. The delete dialog says so instead of
leaving the user to guess.

**Team search is case-insensitive, and so is uniqueness.** Both use the same
notion of equality, which avoids the absurd situation of search finding a team
that creation said did not exist.

**LIKE wildcards in search are literal text.** Searching for `%` searches for
the `%` character, not "everything". See
[003](003-filtering-and-pagination.md).

**What is not validated:** that a colour differs from another team's. Two teams
may share a colour. Preventing that would look helpful and would be hostile —
users have legitimate reasons to group teams by colour.

## Traceability

| Rule | Test |
|---|---|
| TE-1 | `apps/api/tests/unit/domain/team.entity.spec.ts` → `"normaliza o nome colapsando espacos repetidos"`, `"rejeita nome com menos de 2 caracteres"`, `"rejeita nome acima de 60 caracteres"` |
| TE-2 | `apps/api/tests/unit/application/create-team.use-case.spec.ts` → `"rejeita nome duplicado ignorando diferenca de caixa"` |
| TE-3 | `team.entity.spec.ts` → `"normaliza a cor para maiuscula"` |
| TE-4 | `team.entity.spec.ts` → `"trata descricao vazia como ausente"`, `"rejeita descricao acima de 500 caracteres"`, `"permite limpar a descricao passando null"` |
| TE-5 | `apps/api/tests/unit/application/list-teams.use-case.spec.ts` → `"anexa a contagem de tarefas de cada time"` |
| TE-6 | `list-teams.use-case.spec.ts` → `"conta as tarefas de TODOS os times em uma consulta, sem N+1"` |
| TE-7 | `apps/api/tests/integration/teams.routes.spec.ts` (deletion preserving tasks) |
| TE-8 | `apps/mobile/tests/lib/color.test.ts` |
| TE-9 | `create-team.use-case.spec.ts` → `"usa o Clock injetado, e nao a hora real da maquina"` |
