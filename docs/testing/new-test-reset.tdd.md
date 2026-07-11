# New-test reset — TDD evidence

## User journey

As a researcher, I can explicitly start a new test after a saved or completed run without the previous run reappearing.

## RED / GREEN

- RED: `pnpm test -- src/lib/persistence/lab-state.test.ts` failed because no explicit persisted-run deletion existed.
- GREEN: the same focused test passes after adding persisted-run deletion and wiring a complete UI reset.

| Guarantee | Evidence | Result |
|---|---|---|
| New test removes the saved run key | `src/lib/persistence/lab-state.test.ts` | PASS |
| New test clears sessions, replay, events, heatmap, fixes, acceptance, and authorization | `handleNewTest` in `src/app/lab/page.tsx` | PASS build/typecheck |
| New test removes URL configuration and shows a blank target field | `handleNewTest` in `src/app/lab/page.tsx` | PASS build/typecheck |
| Normal reload restoration remains available until explicit reset | Existing persistence restoration tests | PASS |

## Coverage

Persistence coverage: 88.88% statements, 86.95% branches, 100% functions, and 92.3% lines.

## Checkpoints

- RED: `e8c9f89 test: reproduce persisted run reset bug`
- GREEN: `5335502 fix: fully clear saved run for new tests`
