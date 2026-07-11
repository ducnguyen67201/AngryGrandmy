# Live heatmap and dispatched-session restore — TDD evidence

## User journeys

- As a researcher, I see friction hotspots over the exact H browser frame as soon as live frustration evidence arrives.
- As a researcher, I can reload the same lab URL and continue watching every H session that was already dispatched.
- As a researcher, I can intentionally open a different configuration URL without restoring an unrelated saved run.

## RED / GREEN

- RED: the focused test run executed 61 tests and failed because live viewport presentation hid hotspots, live frustration signals had no hotspot conversion, and same-URL reloads did not restore persisted sessions.
- GREEN: `pnpm test` passes 20 files and 63 tests after enabling the overlay, converting live signals, and matching URL configuration before restoring the full snapshot.

| Guarantee | Evidence | Result |
|---|---|---|
| Heatmap remains visible over a real H viewport | `src/lib/ui/live-viewport.test.ts` | PASS |
| Live frustration evidence becomes a hotspot before completion | `src/lib/hotspots/build-hotspots.test.ts` | PASS |
| Dispatched session IDs and statuses survive same-URL reload | `src/lib/persistence/lab-state.test.ts` | PASS |
| A different URL does not restore an unrelated run | `src/lib/persistence/lab-state.test.ts` | PASS |
| Production source compiles and passes static checks | `pnpm build`, `pnpm lint`, `pnpm typecheck` | PASS |

## Coverage

Focused coverage for persistence, live viewport presentation, and live hotspot conversion: 90.62% statements, 89.28% branches, 100% functions, and 93.54% lines.

## Checkpoints

- RED: `b43d5d2 test: reproduce live heatmap and session restore gaps`
- RED extension: `32a395c test: add live frustration hotspot reproducer`
- GREEN: `91d1f66 fix: restore dispatched sessions and live heatmaps`
- Refactor: `cbc053d refactor: isolate live hotspot conversion`
