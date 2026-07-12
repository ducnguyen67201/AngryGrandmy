# Improve from findings — TDD evidence

## Source and journey

No source plan was provided. The journey was derived from the findings-panel request:

> As a product team reviewing a completed usability run, I want to start an improvement from the strongest finding so that the evidence can become a concrete code proposal.

## RED / GREEN report

| Stage | Command | Result | Evidence |
|---|---|---|---|
| RED | `pnpm test -- src/lib/fixes/improvement-handoff.test.ts` | Expected failure | The new test target could not resolve the missing `improvement-handoff` implementation. |
| GREEN | `pnpm exec vitest run src/lib/fixes/improvement-handoff.test.ts` | PASS | 1 file and 3 tests passed. |
| Full suite | `pnpm test` | PASS | 47 files and 169 tests passed. |
| Lint | `pnpm lint` | PASS | ESLint completed without findings. |
| Types | `pnpm typecheck` | PASS | TypeScript completed without errors after the production build regenerated Next.js types. |
| Build | `pnpm build` | PASS | Next.js compiled and generated all 15 static pages. |

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | The handoff selects the highest-severity friction event across all completed testers. | `selects the highest-severity finding across completed testers` | Unit | PASS |
| 2 | An unresolved event wins over a recovered event when severity is tied. | `prioritizes an unresolved finding when severity is tied` | Unit | PASS |
| 3 | Runs without friction evidence do not produce a misleading improvement candidate. | `returns null when there is no actionable friction evidence` | Unit | PASS |

The findings-panel button sends the selected candidate, tester context, run objective, and evidence to the existing proposal-job endpoint. It reports loading, success, missing-evidence, and request-failure states in the lab status line.

## Coverage and known gaps

`pnpm exec vitest run src/lib/fixes/improvement-handoff.test.ts --coverage --coverage.include=src/lib/fixes/improvement-handoff.ts` reports 100% statements, lines, and functions, with 83.33% branch coverage.

Creating a repository branch, applying code, validating the diff, and publishing a GitHub PR remain later workflow stages; this change intentionally starts the evidence-backed proposal handoff only.

## Merge evidence

- RED checkpoint: `8002e18 test: reproduce missing findings improvement handoff`
- GREEN checkpoint: `fc236ea feat: queue improvements from highest-impact findings`
- Validation follow-up: `f2e3749 test: use valid completed-agent visual state`
