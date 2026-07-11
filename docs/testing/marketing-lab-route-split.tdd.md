# Marketing and lab route split — TDD evidence

## User journey

As a visitor, I see a focused marketing homepage at `/` and enter the interactive usability product through `/lab`.

## RED / GREEN

- RED: the marketing-boundary test could not find the marketing heading, and both lab tests failed because `/lab` did not exist.
- GREEN: `/` now contains no product form, its primary CTA links to `/lab`, and the complete desktop/mobile replay flow passes under `/lab`.

| Guarantee | Evidence | Result |
|---|---|---|
| Marketing contains no Product URL form | `tests/e2e/run-flow.spec.ts` | PASS |
| Marketing CTA links to `/lab` | `tests/e2e/run-flow.spec.ts` | PASS |
| Desktop lab flow remains functional | `tests/e2e/run-flow.spec.ts` | PASS |
| Mobile replay remains compact | `tests/e2e/run-flow.spec.ts` | PASS |

## Validation

- `BASE_URL=http://127.0.0.1:3107 pnpm test:e2e` — 3 passed.
- Provider keys were unset for deterministic replay verification.
