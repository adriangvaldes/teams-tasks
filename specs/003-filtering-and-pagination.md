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
| FP-16 | Status and team live in a bottom sheet; the search field stays on the screen. |
| FP-17 | Whatever is active stays visible outside the sheet, as a chip that removes that one filter when tapped. |
| FP-18 | The filter button shows how many of the sheet's filters are active. |
| FP-19 | A team's chip carries that team's colour, with text contrast computed the same way as the chips on a task card. |
| FP-20 | The sheet offers no team section on a team's own screen, nor while the team options have not loaded — the status options keep working either way. |
| FP-21 | "Clear" appears only when at least one of the sheet's filters is active, and resets them together. |
| FP-22 | Selecting an option applies it immediately; the sheet's button reports the resulting count and dismisses. |
| FP-24 | The sheet springs up on open, and closes by the apply button, the backdrop, the Android back button, or by being dragged down past a third of its height or flung. |
| FP-25 | The backdrop's opacity tracks the drag, so a half-dragged sheet is half-dimmed and the gesture is reversible. |
| FP-23 | The empty state distinguishes "nothing exists yet" from "nothing matches the filters", counting search as well. |

*On FP-7: without the tiebreaker, two tasks sharing a `createdAt` can swap
positions between pages and appear duplicated or vanish. It is also what makes
moving to cursor pagination viable without changing the ordering contract.*

*On FP-16 and FP-17: two rows of chips stacked above the list overflowed the
screen and clipped the last team's name. The sheet holds the options and the bar
holds only what is active, which is the pattern mobile filters converged on —
and it leaves room for sorting later without redesigning anything.*

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

**The animation is not `@gorhom/bottom-sheet`.** That library is the usual
answer, and it was rejected on evidence: it has open issues against Reanimated 4
and recent Expo SDKs, which is exactly this stack. The sheet is built directly
on `react-native-reanimated` and `react-native-gesture-handler`, both already
dependencies, which is what the library wraps anyway.

**Reanimated cannot be imported in this Jest setup.** It loads native worklets
and the suite dies with "Cannot read properties of undefined (reading
'loadUnpackers')". Mocking reanimated's individual exports turned into a chase,
so `ui/bottom-sheet.tsx` is mocked instead in the one test file that reaches it.
That draws the line where it belongs: the frame's animation is verified by hand,
its content by tests.

**The sheet's options are presentational.** `TaskFilterSheet` receives the team
list as a prop instead of calling the query itself. That keeps the component
testable without providers, and it costs nothing: the screen already needs the
team list to label the active chip.

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
| FP-14 | pending — the API side is covered by `list-tasks.use-case.spec.ts` → `"combina filtro de time e status"` |
| FP-15 | `apps/mobile/tests/components/task-filter-sheet.test.tsx` → `"emite o time escolhido"`, `"deseleciona ao tocar no time que ja estava ativo"` |
| FP-16 | `task-filter-sheet.test.tsx` → `"lista as opcoes de status e de time"`, `"nao renderiza nada quando esta fechado"` |
| FP-17 | `apps/mobile/tests/components/task-filter-bar.test.tsx` → `"mostra cada filtro ativo como chip removivel"` |
| FP-18 | `task-filter-bar.test.tsx` → `"anuncia quantos filtros estao ativos"` |
| FP-19 | `apps/mobile/tests/lib/color.test.ts` (contrast) |
| FP-20 | `task-filter-sheet.test.tsx` → `"omite a secao de times quando nao ha times para escolher"` |
| FP-21 | `task-filter-sheet.test.tsx` → `"so oferece limpar quando ha filtro ativo"` |
| FP-22 | `task-filter-sheet.test.tsx` → `"fecha pelo botao de aplicar, que anuncia o resultado"` |
| FP-24 | pending — the gesture belongs to `ui/bottom-sheet.tsx` and is verified by hand |
| FP-25 | pending |
| FP-23 | pending |
