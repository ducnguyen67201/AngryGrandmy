# Granny map-to-room transition TDD evidence

## Journey

As a demo viewer, I want persona generation to feel like GrannySmith travels from a neighborhood map into Linda's testing room so the change from setup to synthetic user testing feels cinematic and understandable.

## RED and GREEN

- RED checkpoint `4f47f20`: the focused test failed because the arrival scenes and minimum-duration contract did not exist.
- GREEN: `pnpm vitest run src/lib/ui/granny-arrival.test.ts src/lib/ui/replay-persona-presence.test.ts` passed five tests after the transition contract and scene component were added.
- Static validation: `pnpm typecheck` and `pnpm lint` passed.

## Guarantees

| Guarantee | Result |
|---|---|
| The transition uses a coordinated neighborhood map and Linda testing-room scene | PASS |
| Full-motion users see the complete 4.2-second reveal | PASS |
| Reduced-motion users are not delayed | PASS |
| The `GS` header badge is replaced by Linda's 2D mascot portrait | PASS (build and visual QA) |
| Linda remains the older-adult anchor after model-based persona generation | PASS |

## Visual QA

Verified locally at `http://localhost:3003/lab`: the room reveal renders without clipping, the caption card remains readable, and the transition lands on the persona roster.

The roster keeps Linda while adapting her task and concerns to the tested product, so the character introduced in the transition is the same character dispatched into the replay.

## Assets

- `public/granny-map-journey.png`
- `public/granny-testing-room.png`

Both were generated with the built-in image-generation tool in the same polished 2D editorial style as `public/grandma-linda-2d.png`.
