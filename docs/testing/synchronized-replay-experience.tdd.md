# Synchronized replay heatmap and audio — TDD evidence

## User journey

As a researcher replaying a completed H session, I want the attention heatmap and persona narration to advance with the active evidence frame so that I can understand what the tester noticed at that moment.

## RED

- `2cc6a23 test: specify synchronized replay attention heatmap`
  - replay attention builder did not exist.
- `ba09db3 test: localize narration missing pointer evidence`
  - same-frame narration without coordinates prevented vision localization.

## GREEN

- `fa8d9f5 feat: synchronize replay heatmap and narration`
- Attention coordinates are filtered by selected persona and active replay cursor; future evidence remains hidden.
- Ordinary attention is cooler than uncertainty/frustration, so overlapping difficult moments become yellow/red.
- Vision localization may add coordinates to existing H narration without speaking a duplicate line.
- Replay heatmap coordinates share the exact contained screenshot coordinate space used by the evidence cursor.

## Verification

- Focused suite: 24 tests pass across replay attention, voice queue, screen narration, and cursor selection.
- Focused coverage: 89.39% statements, 88.18% branches, 100% functions, and 98.11% lines.
- Targeted ESLint passes.
- Repository-wide lint/typecheck is currently blocked by an unrelated in-progress syntax edit in `src/lib/product/analyze-product.ts:310`; that user-owned edit was left untouched.
