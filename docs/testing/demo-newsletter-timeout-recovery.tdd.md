# Demo newsletter timeout recovery TDD evidence

## Journey

As a visitor submitting the isolated demo newsletter form, I need a stalled request to recover so I can retry without losing my email.

## RED and GREEN

- RED checkpoint `a637085`: `pnpm --dir demo test` failed because the shared timeout and visual-evidence helper did not exist.
- GREEN: `pnpm --dir demo test` passed six tests after both demo forms adopted the shared client.
- Static/build validation: `pnpm --dir demo typecheck` and `pnpm --dir demo build` passed.

## Guarantees

| Guarantee | Result |
|---|---|
| A stalled browser request aborts instead of leaving the form on `Sending` indefinitely | PASS |
| Successful and rejected API responses retain their existing behavior | PASS |
| Failure evidence uses clamped viewport coordinates and contains no submitted email | PASS |
| Browser reporting emits one schema-valid `GRANNY_EVENT` line for the failed control | PASS |

## Coverage

`pnpm --dir demo test:coverage` reports 100% lines, 81.25% branches, and 85.71% functions for `subscribe-client.ts`.
