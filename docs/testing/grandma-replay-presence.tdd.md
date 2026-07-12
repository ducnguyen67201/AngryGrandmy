# Grandma replay presence TDD evidence

## Journey

As a demo viewer, I want the older-adult tester to appear beside her moving attention point and narration so the replay feels like watching a person use the product rather than tracking an abstract cursor.

## RED and GREEN

- RED checkpoint `9c06e1d`: the focused Vitest target failed because replay persona presence did not exist.
- GREEN: `pnpm vitest run src/lib/ui/replay-persona-presence.test.ts` passed two tests after adding humanized replay labels and Linda’s generated avatar mapping.
- Static validation: `pnpm typecheck` and `pnpm lint` passed.

## Guarantees

| Guarantee | Result |
|---|---|
| Linda and older-adult personas use the generated grandma avatar | PASS |
| Cursor copy says the person “is looking here” rather than exposing cursor telemetry as the primary message | PASS |
| Narration is labeled as the person thinking aloud | PASS |
| Other personas keep their own identity and do not receive Linda’s portrait | PASS |

## Asset


`public/grandma-linda-2d.png` was generated with the built-in image-generation tool by restyling the original Linda portrait as a respectful, expressive 2D product mascot designed to remain legible in a circular replay badge.
