# First-person screen narration TDD evidence

## Source and user journey

No source plan was provided. The journey was derived from the replay request: as a viewer, I want to hear the selected tester think aloud in first person so the synchronized replay feels like a real person using the product rather than a system describing cursor actions.

## Task report

- RED: `pnpm vitest run src/lib/audio/screen-narration.test.ts` ran five tests and failed two assertions because the prompt required third-person narration and the fallback named the persona.
- GREEN: `pnpm vitest run src/lib/audio/screen-narration.test.ts src/app/api/screen-narration/route.test.ts` passed two files and six tests after the prompt and fallback were changed to grounded first-person think-aloud speech.
- Static validation: `pnpm lint` and `pnpm typecheck` passed.

## Test specification

| Guarantee | Test | Type | Result |
|---|---|---|---|
| Vision receives the screenshot and persona context while requesting natural first-person think-aloud speech | `src/lib/audio/screen-narration.test.ts` | Unit | PASS |
| The voice may use brief conversational uncertainty but cannot describe the tester in third person or invent unseen facts | `src/lib/audio/screen-narration.test.ts` | Unit | PASS |
| Provider-unavailable narration remains first-person instead of reverting to telemetry | `src/lib/audio/screen-narration.test.ts` | Unit | PASS |
| The screen-narration API continues resolving captured H frames before vision analysis | `src/app/api/screen-narration/route.test.ts` | Integration | PASS |

## Coverage and known gaps

`pnpm vitest run --coverage src/lib/audio/screen-narration.test.ts` passed with 93.54% statements, 86.84% branches, 100% functions, and 96% lines for `screen-narration.ts`.

Repository-wide tests still include a separate pre-existing RED checkpoint in `src/components/improvement-workspace.test.tsx`; its missing component is unrelated to narration.

## Merge evidence

- RED checkpoint: `18118e7 test: reproduce third-person screen narration`
- GREEN checkpoint: `93ceb05 fix: make replay narration think aloud`
