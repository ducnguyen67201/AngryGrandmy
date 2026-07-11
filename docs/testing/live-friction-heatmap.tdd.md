# Live friction heatmap TDD evidence

## Source and user journey

The journey was derived from the live heatmap request: as a researcher watching an H session, I see new frustration signals appear immediately over the relevant part of the current browser frame and can inspect them during the run or replay.

## Task report

- RED: the focused H integration and live hotspot tests failed because frustration events discarded reported x/y coordinates and the builder always used category-based fallback positions.
- GREEN: focused tests passed after the H prompt requested viewport-relative percentages, the event parser retained valid coordinates, and live hotspots preferred those coordinates.
- Full verification: `pnpm test`, `pnpm lint`, and `pnpm typecheck` passed with 27 test files and 91 tests.
- Coverage: focused live-hotspot coverage reported 100% statements, 92.85% branches, 100% functions, and 100% lines.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Valid H-reported viewport percentages are preserved on live frustration events | `h-company.test.ts: captures reported screen coordinates for live frustration heatmaps` | Integration | PASS |
| 2 | Live markers use the reported coordinates | `build-live-hotspots.test.ts: uses agent-reported screen coordinates for an immediate live marker` | Unit | PASS |
| 3 | Invalid or missing positions use safe deterministic fallback coordinates | `build-live-hotspots.test.ts: falls back to safe deterministic coordinates` | Unit | PASS |

## Merge evidence

- RED checkpoint: `0a504a0 test: specify live heatmap coordinates`
- GREEN checkpoint: `525b7b9 feat: render live H friction heatmaps`

## Known gap

Coordinates are reported by the H agent from its visible viewport. When the provider omits or returns invalid coordinates, the UI intentionally uses category-based fallback placement rather than hiding the signal.
