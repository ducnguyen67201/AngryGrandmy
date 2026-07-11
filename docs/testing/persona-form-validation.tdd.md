# Persona form validation TDD evidence

## Source and user journey

The journey was derived from the reported form regression: as a researcher creating a custom persona, I can press **Create persona** and receive a clear explanation when a required field is missing instead of seeing an apparently active button that cannot be clicked.

## Task report

- RED: `pnpm exec vitest run src/components/persona-builder.test.tsx` failed because the create button was disabled when the persona name was blank.
- GREEN: the same command passed 4/4 tests after moving incomplete-draft validation into the submit handler.
- Full verification: `pnpm test`, `pnpm lint`, and `pnpm typecheck` passed with 24 test files and 82 tests.
- Coverage: focused coverage reported 88.57% statements, 83.33% branches, 100% functions, and 93.93% lines for `persona-builder.tsx`.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | An incomplete draft can be submitted and explains that the persona name is missing | `persona-builder.test.tsx: lets users submit an incomplete draft and explains the missing name` | Component regression | PASS |
| 2 | A complete persona draft calls the creation callback | `persona-builder.test.tsx: collects a persona description and creates a previewable tester` | Component | PASS |
| 3 | Creation remains unavailable until a generated panel exists | `persona-builder.test.tsx: requires a generated panel before persona creation` | Component | PASS |

## Merge evidence

- RED checkpoint: `c394cf2 test: reproduce silent persona form validation`
- GREEN checkpoint: `9f9fac7 fix: explain incomplete persona drafts`

No browser E2E test was added; the interaction and accessible validation text are exercised through the rendered component.
