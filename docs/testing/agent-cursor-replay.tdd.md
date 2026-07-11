# Agent cursor replay TDD evidence

## Source and user journey

The journey was derived from the demo request: as a researcher watching a live or replayed H session, I see where the selected agent is pointing on the active evidence frame so the run feels observable rather than like a slideshow.

## Task report

- RED: the focused cursor and H integration tests failed because no cursor selector existed and think-aloud coordinates were discarded.
- GREEN: focused tests passed after H was instructed to report pointer percentages, narration parsing retained valid positions, and replay selected the latest point at or before the active frame.
- Full verification: `pnpm test`, `pnpm lint`, and `pnpm typecheck` passed with 28 test files and 95 tests.
- Coverage: focused cursor coverage reported 100% statements, branches, functions, and lines.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Replay chooses the newest reported pointer position at or before the frame cursor | `agent-cursor.test.ts: uses the latest reported cursor` | Unit | PASS |
| 2 | Old evidence without pointer data uses a clearly labeled heatmap estimate | `agent-cursor.test.ts: labels a heatmap position as estimated` | Unit | PASS |
| 3 | Invalid or unavailable evidence produces no misleading cursor | `agent-cursor.test.ts: renders no cursor` | Unit | PASS |
| 4 | H think-aloud events retain valid pointer percentages | `h-company.test.ts: captures the agent pointer position from think-aloud action events` | Integration | PASS |

## Merge evidence

- RED checkpoint: `906f3e6 test: specify evidence-aware agent cursor`
- GREEN checkpoint: `09c9c93 feat: animate agent cursor over evidence`

## Display contract

- Green label: position reported by H for the selected persona.
- Purple label: estimated from the nearest heatmap evidence for an older run.
- Cursor transitions smoothly between frame positions and does not intercept user input.
