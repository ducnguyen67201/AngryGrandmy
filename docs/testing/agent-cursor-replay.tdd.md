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
- Legacy replay RED checkpoint: `c6546b8 test: reproduce missing legacy replay cursor`
- Legacy replay GREEN checkpoint: `7a6836f fix: always show cursor during legacy replay`

## Display contract

- Green label: position reported by H for the selected persona.
- Purple label: explicitly estimated for an older run without H pointer coordinates.
- Cursor transitions smoothly between frame positions and does not intercept user input.
- Legacy runs with no coordinate evidence receive a bounded moving demo path, explicitly labeled estimated.

## Live frozen-cursor follow-up

- Root cause: the estimated position was derived only from the H frame index, so it froze whenever the latest screenshot remained on screen.
- RED checkpoint: `c39b0b1 test: reproduce frozen estimated cursor`.
- GREEN checkpoint: `9f2a037 fix: animate estimated live cursor`.
- Live estimated cursors now follow a bounded, smoothly interpolated path every 700 ms between H frame updates. Reported H coordinates remain exact and take priority.
- Focused verification: 5/5 tests pass with 100% statements, functions, and lines and 95% branch coverage. Targeted ESLint passes.
- Repository-wide typecheck is currently blocked by unrelated, concurrently added calibration tests whose implementation modules are not yet present.

## Evidence-based localization follow-up

- The animated estimate above is superseded: random cursor movement is no longer rendered when coordinates are absent.
- RED checkpoints: `3c43308 test: specify evidence-based cursor localization` and `00e8001 test: allow cursor localization during replay`.
- GREEN checkpoint: `182cdf1 fix: localize cursor from screenshot evidence`.
- H-reported coordinates remain green and are labeled **H reported**.
- When H omits coordinates, OpenAI vision may identify the relevant visible element and return validated screenshot-relative `x/y`; these points are blue and labeled **vision located**.
- When neither source provides a valid position, the cursor is hidden.
- Cursor coordinates now render inside a 1280×900 `object-fit: contain` coordinate space, preventing the surrounding panel gutters from shifting the point.
- Verification: 41 files and 137 tests pass; ESLint and TypeScript pass. Focused coverage is 95.71% statements, 91.39% branches, 100% functions, and 98.36% lines.
