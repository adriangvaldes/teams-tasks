# Contributing

Conventions that apply to every change in this repository: the layering rule,
the code and commit conventions, and the traps this codebase has already paid
for.

The three documents divide the work:

| Document | Answers |
|---|---|
| `README.md` | How to run the project, and why the architecture looks the way it does |
| `specs/` | What the system guarantees, rule by rule, and which test proves each one |
| this file | How to work on it without the conventions drifting |

Read the spec for the area before changing behaviour in it.

## Commands

| Action | Command |
|---|---|
| Bring everything up from scratch | `pnpm setup` |
| API in dev | `pnpm dev:api` |
| App in dev | `pnpm dev:mobile` |
| API tests (unit) | `pnpm --filter @teams-tasks/api test` |
| API tests (unit + integration, needs Docker) | `pnpm --filter @teams-tasks/api test:all` |
| Everything | `pnpm test:all` |
| Types | `pnpm typecheck` |
| Lint and formatting | `pnpm lint` / `pnpm format` |

Always run `pnpm lint` and `pnpm typecheck` before calling a change done. Biome
is the single source of style — do not argue about formatting, run
`pnpm format`.

## API layering rule

Each layer may only import from layers with a **lower** index. This is the rule
that is not negotiable.

| Index | Layer | May import from |
|---|---|---|
| 0 | `domain` | nothing |
| 1 | `application` | `domain` |
| 2 | `infrastructure` | `domain`, `application` |
| 2 | `interfaces/http` | `domain`, `application` |
| 3 | `container`, `main` | everything |

Practical consequences:

- The domain does **not** know about HTTP. It classifies errors as `VALIDATION`,
  `NOT_FOUND` or `CONFLICT`. Translation to 400/404/409 happens in a single
  middleware.
- Nothing above `main.ts` calls `new Date()` or generates a UUID. Use the `Clock`
  and `IdGenerator` ports — that is what makes the tests deterministic.
- Prisma errors (`P2002`, `P2003`, `P2025`) are translated into domain errors
  **inside** the infrastructure layer. No Prisma code leaks upward.
- Wiring is manual in `container.ts`. Do not introduce a DI container.

## Code conventions

**No explanatory comments inside source files.** The code says *what*; the test
name, the spec or the README say *why*. Comments are allowed in configuration
files, where they document a real trap (see `pnpm-workspace.yaml` and
`docker-compose.yml`).

**Validation lives in `packages/shared`.** One Zod schema per contract, used by
the API to validate the request and by the app to validate the form. Do not
duplicate a validation rule across the two sides.

**Response contracts.** Success is `{ data, meta? }`. Error is
`{ error: { code, message, details? } }` with `details[].path` pointing at the
field.

**Language.** Code identifiers, specs and this document are in English.
User-facing strings, the README and existing test names are in Portuguese — keep
them that way; do not translate a test name, it is an identifier people search
for.

## Commits

**Never add tool-generation trailers.** No `Co-Authored-By` naming an assistant,
no `Generated with`, no session links, no emoji signature. The history carries
no marks of the tooling used to produce it — that is a standing rule, not a
per-commit preference, and it applies even when the tool's own default is to add
them. Check the message before committing; if a trailer is there, strip it.

The rest of the convention:

- Conventional commits, in English: `type(scope): subject in the imperative`.
- **Atomic.** One concern per commit. When one file carries two unrelated
  changes, split the hunks — do not group by file.
- The body explains *why*, not *what*. The diff already says what.
- No em dashes, no emoji.
- Every commit must stand on its own: `pnpm lint` and `pnpm typecheck` pass at
  each one, not only at the tip of the branch.

## App conventions

- Cache keys come from `queryKeys` (`src/api/query-keys.ts`). Never write a key
  array by hand.
- Paginated listings use `<PaginatedList>` with `useInfiniteQuery`. Do not
  reimplement loading, error and empty states.
- User-facing error messages come from `messageFromError(error, fallback)`
  (`src/lib/error-message.ts`). Do not write
  `error instanceof ApiError ? … : …` in a screen.
- The floating button is `<Fab label="…">`. Forms are `react-hook-form` +
  `zodResolver` with the schema from `packages/shared`.
- Styling is NativeWind. No `styled-components`, and no `StyleSheet.create` for
  what a class solves.

## When changing behaviour

1. Find the matching spec in `specs/`. If the rule exists, it is a contract:
   changing it is a decision, not a detail.
2. Change the rule in the spec **and** the test that proves it, in the same
   change.
3. If the feature is new, copy `specs/_template.md` before writing code.

## Known traps in this codebase

- **Native Postgres on 5432.** If the machine already has one, Docker publishes
  the port without failing and `pnpm setup` seeds the wrong database while
  reporting success. The README has the correct diagnostic — the one that
  connects *from outside*, not via `docker compose exec`.
- **`prisma generate` on Windows.** Fails with `EPERM` when the API is running,
  because the process holds the engine DLL open. That is why
  `verifyDepsBeforeRun: false` is set in `pnpm-workspace.yaml`.
- **`nodeLinker: hoisted` is mandatory.** Metro cannot resolve pnpm's isolated
  symlink tree.
