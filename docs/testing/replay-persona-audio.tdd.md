# Replay persona audio TDD evidence

## Source and user journey

The journey was derived from the replay request: as a researcher replaying captured H evidence, I hear the selected persona's narration near the matching evidence frame using a mature, reassuring Gradium voice.

## Documentation evidence

Gradium's authenticated `GET /voices/` catalog was queried with catalog voices included. No voice was explicitly labeled “grandmother.” Holly (`7c5UOKm7AiBgJADg`) was selected because its catalog description identifies it as a mature, calm English voice with a reassuring presence. Gradium also documents custom voice creation for a future performer-specific voice.

## Task report

- RED synchronization: `pnpm exec vitest run src/lib/audio/live-voice-queue.test.ts` failed because replay-frame narration selection did not exist.
- RED voice selection: the focused Gradium test failed because the previous default voice was used instead of Holly.
- GREEN: focused replay/Gradium tests passed 7/7 after adding cursor synchronization, voice caching, replay fallback narration, and safe TTS fallbacks.
- Full verification: `pnpm test`, `pnpm lint`, and `pnpm typecheck` passed with 26 test files and 87 tests.
- Coverage: focused coverage reported 100% statements, 96.66% branches, 100% functions, and 100% lines.
- Live provider check: `/api/voice-reaction` returned `mode: gradium`, `audio/wav`, and approximately 253 KB of audio for a short reaction using the configured voice.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Replay narration is selected by persona and frame cursor without repeating earlier events | `live-voice-queue.test.ts: aligns replay narration with the frame cursor` | Unit | PASS |
| 2 | Multiple narration events are ordered by cursor | `live-voice-queue.test.ts` replay ordering assertion | Unit | PASS |
| 3 | Holly is the default when no per-persona voice is configured | `gradium.test.ts: uses the mature, calm Holly catalog voice by default` | Integration | PASS |
| 4 | Missing or failing Gradium configuration returns safe text fallback data | `gradium.test.ts` fallback cases | Integration | PASS |

## Merge evidence

- RED checkpoints: `fbc56fb test: specify replay narration synchronization`, `f07741d test: specify mature replay voice default`
- GREEN checkpoint: `3f88440 feat: synchronize replay narration with evidence`

## Known gap

Replay audio uses cached whole WAV responses from Gradium REST. Chunk-level WebSocket streaming remains a later latency optimization.
