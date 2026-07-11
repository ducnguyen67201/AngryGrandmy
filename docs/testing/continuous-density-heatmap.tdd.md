# Continuous density heatmap — TDD evidence

## User journey

As a researcher watching a usability run, I want friction signals to form a continuous green/yellow/red density field over the tested page, so that clusters and severity are visible at a glance while individual findings remain selectable.

## RED

- Commit: `8e55f32` (`test: specify continuous heatmap density`)
- Command: `pnpm vitest run src/lib/hotspots/build-heatmap-density.test.ts`
- Result: failed because `build-heatmap-density` did not exist.
- Guarantees specified: severity controls radius/intensity, coordinates are retained and bounded, and rendering work retains the newest 18 signals.

## GREEN

- Commit: `7c6033e` (`feat: render continuous friction heatmap`)
- Focused test: 3/3 passing.
- Full regression: 29 files, 100 tests passing.
- Focused coverage: 100% statements, functions, and lines.
- Quality gates: ESLint and TypeScript passed.

## UI contract

- Density blobs render below the numbered findings and agent cursor.
- Each blob uses a blurred red → orange → yellow → green → transparent radial field.
- Overlapping fields compound visually through multiply blending.
- The latest six numbered findings remain clickable above the continuous layer.
