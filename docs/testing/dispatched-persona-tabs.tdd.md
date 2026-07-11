# Dispatched persona tabs TDD evidence

## Source and user journey

The journey was derived from the reported live-run regression: as a researcher who dispatches one tester, I only see that dispatched tester in the run dock, so standby personas are not presented as active sessions.

## Task report

- RED: `pnpm test -- src/lib/run/tester-count.test.ts` ran the new regression case and failed because `getDispatchedPersonas` did not exist.
- GREEN: `pnpm exec vitest run src/lib/run/tester-count.test.ts` passed 3/3 tests after the run dock was filtered by session persona IDs.
- Full verification: `pnpm test`, `pnpm lint`, and `pnpm typecheck` passed with 24 test files and 81 tests.
- Coverage: `pnpm exec vitest run src/lib/run/tester-count.test.ts --coverage --coverage.include=src/lib/run/tester-count.ts` reported 91.66% statements, 87.5% branches, 100% functions, and 100% lines.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | A run with one dispatched session exposes only that session's persona | `tester-count.test.ts: shows only personas that have a dispatched session in the run view` | Unit/regression | PASS |
| 2 | Persona order follows the generated panel order | `tester-count.test.ts: limits launched personas while preserving panel order` | Unit | PASS |

## Merge evidence

- RED checkpoint: `b798a60 test: reproduce undispatched persona tabs`
- GREEN checkpoint: `08b2591 fix: hide undispatched personas from live runs`

No E2E browser test was added; the visible dock uses the covered selector directly, while the full TypeScript and lint checks validate its integration into the page.
