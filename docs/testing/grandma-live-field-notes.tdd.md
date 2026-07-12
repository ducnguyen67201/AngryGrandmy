# Grandma live field notes TDD evidence

## User journey

As a demo viewer, I want useful observations to appear while computer-use testers are still running so the live room feels active and I can understand what each tester found or felt without waiting for the final report.

## RED and GREEN checkpoints

- RED `8162fc0`: the field-note builder did not exist, so the new live narration, progress, and final-finding tests could not compile.
- RED `b81659a`: the launch-only `Requesting H Company session` placeholder was incorrectly presented as returned evidence.
- RED `7d5202a`: raw viewport events produced repetitive cards and provider status was not translated into human language.
- GREEN `df6b0a6`: the live event stream, responsive sidebar, accessible log, deduplication, and human-readable progress copy passed the focused tests.
- Coverage `115d7f4`: focused field-note coverage reached 100% statements/lines/functions and 91.52% branches.

## Guarantees

| Guarantee | Evidence | Result |
|---|---|---|
| Narration becomes “is thinking aloud” copy | `grandma-field-notes.test.ts` | PASS |
| Friction becomes a “feels unsure” or recovered note | `grandma-field-notes.test.ts` | PASS |
| Returned session progress appears before final findings | `grandma-field-notes.test.ts` | PASS |
| Launch placeholders are not presented as discoveries | `grandma-field-notes.test.ts` | PASS |
| Only the newest raw viewport arrival per tester remains visible | `grandma-field-notes.test.ts` | PASS |
| Final findings remain in the stream after completion | `grandma-field-notes.test.ts` | PASS |
| Repeated/empty notes are removed and the stream is bounded | `grandma-field-notes.test.ts` | PASS |
| Narrow screens move the field notes below the replay | responsive CSS and visual inspection | PASS |

## Visual QA

Verified against real H Company sessions at `http://localhost:3000/lab`. The sidebar filled the previously unused wide-screen space, rendered returned progress while agents were active, and remained readable alongside the exact H viewport. The accessible DOM exposed the feed as `Grandma's live field notes` with a polite live log.

## Validation

- `pnpm vitest run src/lib/ui/grandma-field-notes.test.ts src/lib/runtime/agent-events.test.ts`
- `pnpm vitest run --coverage src/lib/ui/grandma-field-notes.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm audit --audit-level high`
