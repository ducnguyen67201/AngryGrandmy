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

## Visible proposal result regression

The first handoff version only updated a status line after starting a potentially slow codebase-analysis request. This made the click appear to do nothing and discarded the proposal details returned by the endpoint.

| Stage | Command | Result | Evidence |
|---|---|---|---|
| RED | `pnpm exec vitest run src/components/improvement-workspace.test.tsx` | Expected failure | The visible improvement workspace component did not exist. |
| GREEN | `pnpm exec vitest run src/components/improvement-workspace.test.tsx` | PASS | 1 file and 3 interaction-state tests passed. |
| Full suite | `pnpm test` | PASS | 48 files and 172 tests passed. |
| Coverage | `pnpm exec vitest run src/components/improvement-workspace.test.tsx --coverage --coverage.include=src/components/improvement-workspace.tsx` | PASS | 100% statements, branches, functions, and lines. |
| Build and types | `pnpm build && pnpm typecheck` | PASS | Production build and TypeScript validation completed successfully. |

The workspace now appears immediately with the selected recommendation and evidence, shows codebase-reading progress during the request, renders returned proposal details, and displays request errors beside the finding.

- RED checkpoint: `12b1cf4 test: reproduce invisible improvement proposal result`
- GREEN checkpoint: `88a224c fix: reveal improvement progress and proposal results`

## Connected repository and PR readiness

The PR preparation stage is deliberately separate from publishing. It requires the configured repository id to match, refuses an already-dirty target, runs a write-scoped local coding agent, captures the target-only Git diff, and runs the target's available test/typecheck/lint/build scripts. `readyForPr` is true only when a non-empty diff exists and every discovered check passes.

| Stage | Command | Result | Evidence |
|---|---|---|---|
| Service RED | `pnpm exec vitest run src/lib/fixes/prepare-repository-change.test.ts` | Expected failure | The repository preparation service did not exist. |
| Service GREEN | Same command after implementation | PASS | 4 repository policy and readiness tests passed. |
| API RED | `pnpm exec vitest run src/app/api/improvements/prepare/route.test.ts` | Expected failure | The guarded preparation route did not exist. |
| API GREEN | Same command after implementation | PASS | Valid input returned an unpublished diff; malformed input returned 422. |
| UI RED | `pnpm exec vitest run src/components/improvement-workspace.test.tsx` | Expected failure | No prepare-change action or PR-ready diff state was visible. |
| UI GREEN | Same command after implementation | PASS | Connected, disconnected, preparing, checks, diff, and PR-ready states render correctly. |
| Full suite | `pnpm test` | PASS | 50 files and 179 tests passed before the coverage refactor; the focused suite added one additional UI test. |
| Coverage | Focused three-target Vitest coverage command | PASS | 93.75% statements, 83.33% branches, 100% functions, and 96.55% lines. |
| Security | `pnpm audit --audit-level high` | PASS | No known vulnerabilities found. |
| Build and types | `pnpm build && pnpm typecheck` | PASS | Production build and TypeScript validation completed successfully. |

Publishing remains intentionally out of scope for this stage: no commit, push, or GitHub PR is created without a later explicit user action.

- Service RED: `5862c64 test: reproduce missing PR-ready repository change`
- Service GREEN: `f407cb2 feat: prepare validated changes in connected repository`
- API RED: `6829c37 test: reproduce missing repository preparation endpoint`
- API GREEN: `c21d556 feat: expose guarded code change preparation API`
- UI RED: `56a514c test: reproduce missing PR readiness UI`
- UI GREEN: `3fb38cd feat: show validated diff and PR readiness`
- Refactor: `376ec09 refactor: isolate repository write adapters`

### Connection-mode cache regression

The lab now invalidates a cached fallback proposal when it restarts with `GRANNYSMITH_FIX_AGENT_MODE=codex`, allowing the same finding to be regenerated against the newly connected repository.

- RED: `pnpm exec vitest run src/lib/fixes/fix-job-cache.test.ts` failed because the cache policy was missing.
- GREEN: 2 cache-mode tests passed; the full suite passed with 51 files and 182 tests.
- RED checkpoint: `f42d311 test: reproduce stale fallback proposal cache`
- GREEN checkpoint: `1a53757 fix: refresh fallback proposals after repo connection`
