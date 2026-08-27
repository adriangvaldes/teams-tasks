# NNN — <Feature name>

> Status: **draft** | **current** | **obsolete since YYYY-MM-DD**

## Context

Two or three sentences. Why this part exists, which user problem it solves, and
what it deliberately does not try to solve.

## Rules

Numbered, present tense, verifiable. The prefix is the feature's initials.

| # | Rule |
|---|---|
| XX-1 | … |
| XX-2 | … |

When a rule has a non-obvious reason, write the reason in italics right below
it. When the reason is obvious, write nothing — noise is worse than silence.

## Contracts

The exact input and output shapes. Use real examples, copied from an actual run,
not invented ones.

```http
POST /api/… HTTP/1.1
Content-Type: application/json

{ … }
```

```json
{ "data": { … } }
```

### Errors

| Situation | HTTP | `code` |
|---|---|---|
| … | … | … |

## Edge cases

What happens at the boundary, and what was decided **not** to do. This is the
most valuable section of a spec: it is where the knowledge that otherwise gets
lost is written down.

## Traceability

Each rule and the test that proves it. `pending` is an acceptable and visible
answer.

| Rule | Test |
|---|---|
| XX-1 | `apps/api/tests/unit/…` → `"the it() name"` |
| XX-2 | pending |
