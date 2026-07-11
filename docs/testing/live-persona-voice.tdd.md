# Live persona voice TDD evidence

## Source and user journey

The journey was derived from the requested live usability experience: as a researcher watching an H Company run, I can explicitly enable sound and hear the selected persona's new first-person reactions in order without stale narration piling up.

## Task report

- RED: `pnpm exec vitest run src/lib/audio/live-voice-queue.test.ts` failed because the live voice queue module did not exist.
- GREEN: the focused live voice and H integration tests passed 9/9 after implementing eligibility, deduplication, and bounded queuing.
- Full verification: `pnpm test`, `pnpm lint`, and `pnpm typecheck` passed with 25 test files and 85 tests.
- Coverage: focused queue coverage reported 100% statements, branches, functions, and lines.
- Runtime smoke check: `curl http://localhost:3000/lab` returned HTTP 200 from the already-running local app.

## Test specification

| # | What is guaranteed | Test | Type | Result |
|---|---|---|---|---|
| 1 | Only the selected persona's new narration is eligible for live speech after sound is enabled | `live-voice-queue.test.ts: speaks only new narration for the selected persona after live voice is enabled` | Unit | PASS |
| 2 | Duplicate H narration events are not queued twice | `live-voice-queue.test.ts: does not enqueue the same narration twice` | Unit | PASS |
| 3 | When speech falls behind, the queue retains only the newest pending reactions | `live-voice-queue.test.ts: keeps only the newest pending reactions when narration falls behind` | Unit | PASS |
| 4 | H sessions continue to emit parseable narration and computer-use events | `h-company.test.ts` | Integration | PASS |

## Merge evidence

- RED checkpoint: `ac0435a test: specify live persona audio queue`
- GREEN checkpoint: `b5cc2ba feat: play queued live persona narration`

## Known gap

This iteration uses Gradium's existing REST TTS response and a browser audio queue. True chunk-level WebSocket audio streaming remains a follow-up; the explicit sound unlock and 1.8-second event polling provide the reliable low-latency MVP.
