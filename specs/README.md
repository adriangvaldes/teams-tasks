# Specs

Each spec describes the **contracted behaviour** of one part of the system: what
has to stay true after any refactor, and why.

A spec is not documentation of the code. The code already describes itself. The
spec exists to answer the question the code cannot: *is this intentional, or is
it this way by accident?*

## How a spec is written

Every spec follows [`_template.md`](_template.md) and has five sections:

| Section | What goes in |
|---|---|
| **Context** | Why this part exists and which problem it solves. Keep it short. |
| **Rules** | Numbered, testable statements in the present tense. One rule per line. |
| **Contracts** | Exact input and output shapes, with real examples. |
| **Edge cases** | What happens at the boundary, including what was decided *not* to do. |
| **Traceability** | For each rule, the test that proves it. |

## The rule about rules

A rule earns its place only if it passes three checks:

1. **It is verifiable.** "Search ignores case" is a rule. "Search is fast" is
   not.
2. **A test proves it.** Without a test, a rule is an intention, not a contract.
   When no test exists yet, the traceability row says `pending` — that is a
   visible debt, not a hidden detail.
3. **Someone could plausibly break it without noticing.** Rules that are too
   obvious only add noise.

## Implementing a new feature

1. Copy `_template.md` to `NNN-feature-name.md`.
2. Write the rules **before** the code. If you cannot write the rule, you do not
   understand the feature yet.
3. Implement until every rule has a green test pointing at it.
4. Update the spec of whatever the feature touched, if the contract changed.

Numbering is sequential and never reused. A retired spec gets the header
`> **Obsolete since <date>.** Superseded by NNN.` and stays in the repository —
the record of why something changed is worth more than one saved file.

## Index

| Spec | Subject |
|---|---|
| [001](001-tasks.md) | Tasks: lifecycle, status, due date, team links |
| [002](002-teams.md) | Teams: identity, colour, deletion and what survives it |
| [003](003-filtering-and-pagination.md) | Filtering, search, sorting and pagination |
| [004](004-offline-and-optimistic-updates.md) | Cache, optimistic updates and offline behaviour |

## Relationship to the README

The root `README.md` explains **how to run the project and why the architecture
looks the way it does**. The specs explain **what the system guarantees**. When
the two cover the same subject, the spec is the source of truth about behaviour
and the README about the decision.

The README is written in Brazilian Portuguese, for the audience that reviews the
project. Specs are written in English, as engineering artefacts, and so is
`CONTRIBUTING.md`. Test names quoted in traceability tables are reproduced
verbatim — they are real identifiers in the code, and several of them are in
Portuguese.
