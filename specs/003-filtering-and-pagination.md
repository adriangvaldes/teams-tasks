# 003 — Filtering, search, sorting and pagination

> Status: **current**

## Context

Every listing in the system goes through here. The rules are shared between
tasks and teams so that the client does not have to learn two dialects — `meta`
has the same shape, `sort` has the same grammar, and the ceiling on `limit` is
the same.

## Rules

| # | Rule |
|---|---|
| FP-1 | Every listing responds `{ data, meta }` with `meta = { total, limit, offset, hasMore }`. |
| FP-2 | `total` counts the **filtered** set, not the whole table. |
| FP-3 | `limit` defaults to 20 and is capped at 100. Asking for 101 is a validation error, not a silent clamp. |
| FP-4 | `hasMore` is `offset + limit < total`. |
| FP-5 | An `offset` beyond the total returns an empty list and `hasMore: false`, never an error. |
| FP-6 | `sort` has the form `field:direction`, from a closed list. A value outside the list is a validation error that enumerates the valid options. |
| FP-7 | Every ordering has `id: asc` as its final tiebreaker. |
| FP-8 | Sorting by `dueDate` puts nulls last, in both directions. |
| FP-9 | Search is case-insensitive and covers title and description (tasks) or name and description (teams). |
| FP-10 | The LIKE wildcards — `%`, `_` and `\` — are treated as literal text in search. |
| FP-11 | Task filters (`teamId`, `status`, `search`) are combinable and apply together (AND). |
| FP-12 | The teams for a page of tasks are resolved in **one** query, never one per task. |
| FP-13 | In the app, search is debounced at 350 ms and the term is trimmed before it becomes a cache key. |
| FP-14 | The global task list filters by team, status and text at the same time; the three are independent and combine. |
| FP-15 | The team filter is single-select, mirroring the API, where `teamId` takes one id and not a list. |
| FP-16 | Each team's filter chip carries that team's colour, with text contrast computed the same way as the chips on a task card. |
| FP-17 | The team filter is not rendered on a team's own screen, where the listing is already scoped to that team. |
| FP-18 | While the team options are loading or failed to load, the team row is absent and the other filters keep working. |
| FP-19 | A "clear filters" action appears only when at least one filter is active, and resets all three at once. |
| FP-20 | The empty state distinguishes "nothing exists yet" from "nothing matches the filters", counting all three filters. |

*On FP-7: without the tiebreaker, two tasks sharing a `createdAt` can swap
positions between pages and appear duplicated or vanish. It is also what makes
moving to cursor pagination viable without changing the ordering contract.*

*On FP-10: before the fix, `search=%` returned the entire dataset and `search=_`
did too — the value went straight into Prisma's `contains`, which builds
`LIKE '%value%'` without escaping. A user searching for "50%" silently got wrong
results.*

## Contracts

### `sort` grammar

| Resource | Accepted values | Default |
|---|---|---|
| Tasks | `createdAt`, `dueDate`, `title`, `status` × `asc`, `desc` | `createdAt:desc` |
| Teams | `name`, `createdAt` × `asc`, `desc` | `name:asc` |

```http
GET /api/tasks?teamId=<uuid>&status=PENDING&search=deploy&sort=dueDate:asc&limit=20&offset=0
```

```json
{
  "data": [ … ],
  "meta": { "total": 10, "limit": 20, "offset": 0, "hasMore": false }
}
```

### Invalid `sort` error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Requisição inválida",
    "details": [{
      "path": "sort",
      "message": "Invalid option: expected one of \"createdAt:asc\"|\"createdAt:desc\"|…"
    }]
  }
}
```

The message enumerates the options on purpose: whoever is integrating discovers
the contract from the error, without opening the code.

## Edge cases

**Search does a sequential scan, and that is acceptable at this scale.** `ILIKE
'%term%'` cannot use a b-tree index — none of them. The index on `title` serves
the `sort=title:*` *ordering*, not the search. At tens of thousands of rows the
answer is a GIN index with `pg_trgm`; the decision was not to anticipate it.

**Offset pagination, not cursor.** Offset is what the brief suggests and what
the app's `FlatList` consumes through `useInfiniteQuery`. The known drawback is
instability when items are inserted between two pages. Rule FP-7 is what leaves
the door open to cursors without breaking clients.

**`total` comes from a second query, inside the same transaction.** `findMany`
and `count` run together, so the page and the total always describe the same
instant of the database.

**An empty search term is not sent.** The client omits the parameter rather than
sending `search=`, and the server requires at least 1 character when the
parameter is present. That avoids two different cache keys for the same listing.

**The team filter is single-select, and that is the API's shape, not a
simplification.** `teamId` takes one id. Multi-team filtering would need the
server to decide between "in any of these teams" and "in all of these teams" —
two different queries with different index behaviour. Until a real use case
picks one, the client does not pretend to offer both.

**Filtering by team is not the same screen as browsing a team.** Tapping a team
opens that team's screen, which carries its header, task count and actions. The
filter on the global list answers a different question - "show me this team's
work alongside my other filters" - and it keeps the user where they are.

## Traceability

| Rule | Test |
|---|---|
| FP-1 | `apps/api/tests/integration/tasks.routes.spec.ts`, `teams.routes.spec.ts` |
| FP-2 | `tasks.routes.spec.ts` → `"pagina mantendo o total do conjunto filtrado"` |
| FP-3 | `tasks.routes.spec.ts` (limit above the cap) |
| FP-4 | `apps/api/tests/unit/application/list-tasks.use-case.spec.ts` → `"devolve a pagina inteira com o total, para montar o meta"` |
| FP-5 | pending — verified manually, no automated test |
| FP-6 | `tasks.routes.spec.ts` → `"rejeita valor de sort fora da lista permitida"` |
| FP-7 | pending |
| FP-8 | pending |
| FP-9 | `list-tasks.use-case.spec.ts` → `"busca por texto no titulo, ignorando a caixa"`; `tasks.routes.spec.ts` → `"busca por texto ignorando a caixa"` |
| FP-10 | `apps/api/tests/unit/infrastructure/prisma-search.spec.ts` (all cases); `tasks.routes.spec.ts` → `"trata curingas de LIKE como texto literal na busca"`, `"encontra a tarefa que contem o curinga no titulo"` |
| FP-11 | `list-tasks.use-case.spec.ts` → `"combina filtro de time e status"`; `tasks.routes.spec.ts` → `"combina teamId e status"` |
| FP-12 | `list-tasks.use-case.spec.ts` → `"resolve os times da pagina em UMA consulta, sem N+1"` |
| FP-13 | pending |
| FP-14 | pending |
| FP-15 | pending |
| FP-16 | pending |
| FP-17 | pending |
| FP-18 | pending |
| FP-19 | pending |
| FP-20 | pending |
