# Synchronized audio and heatmap replay TDD evidence

## User journey

As a presenter reviewing a completed H Company run, I want GrannySmith to
prepare narration audio and attention heatmaps for every captured screen so one
Play action feels like watching a synchronized video.

## RED

- Command: `pnpm test -- src/lib/replay/synchronized-replay.test.ts`
- Result: failed because the synchronized replay timeline did not exist.
- Checkpoint: `242c958 test: reproduce unsynchronized completed-run replay`

## GREEN

- Command: `pnpm test -- src/lib/replay/synchronized-replay.test.ts`
- Result: 46 test files and 163 tests passed at the focused GREEN checkpoint.
- Targeted coverage command:
  `pnpm exec vitest run src/lib/replay/synchronized-replay.test.ts --coverage --coverage.include=src/lib/replay/synchronized-replay.ts`
- Targeted coverage result: 100% statements, branches, functions, and lines.

## Guarantees

| # | Guarantee | Test | Result |
|---|---|---|---|
| 1 | Every captured frame is paired with its exact generated narration event, cached audio, and valid attention coordinates. | `pairs each captured screen with its narration, audio, and attention point` | PASS |
| 2 | Replay remains unavailable until every frame has narration and prepared audio. | `stays unready until every screen has both narration and prepared audio` | PASS |
| 3 | Narration text without cached audio cannot falsely mark replay ready. | `does not treat narration without cached audio as replay-ready` | PASS |
| 4 | Playback advances in order and stops on the last frame. | `advances after narration and stops on the final frame` | PASS |

## Implementation behavior

- Post-run processing now generates narration and prepares voice output even
  when live voice was not previously enabled.
- The first prepared frame and heatmap become visible automatically.
- Play advances only after the active frame narration completes; the previous
  fixed three-second frame timer was removed.
- The frame is painted before its narration begins.
- The completed-run UI no longer requires a per-frame “Narrate this screen”
  click and instead reports replay preparation/readiness.

## Known limits

- Provider audio can fall back to browser speech when Gradium is unavailable.
- A fresh completed H run is still required for end-to-end provider validation;
  the pure synchronization state machine is covered deterministically here.
