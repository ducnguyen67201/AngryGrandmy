# Live H viewport — TDD evidence

## Source and journey

Journey derived from the live usability room: as a researcher, I can see the exact H Company browser frames inside GrannySmith so that the observed session is not represented by a static placeholder.

## RED / GREEN

- RED: `pnpm test -- src/lib/integrations/h-company.test.ts` ran 58 tests and failed the two new viewport/security cases because the integration still called `/events` and accepted an invalid session path.
- GREEN: the same command ran 58 tests successfully after switching to `/changes?from_index=...`, extracting observation images, and validating session identifiers.

| Guarantee | Evidence | Result |
|---|---|---|
| H observation images become exact viewport events | `src/lib/integrations/h-company.test.ts` — “returns the real browser viewport from H session changes” | PASS |
| The feed cursor advances using H's `next_index` | Same integration test | PASS |
| Malformed session identifiers never reach H | `src/lib/integrations/h-company.test.ts` — “does not send invalid session identifiers to H” | PASS |
| Existing unit and integration behavior remains intact | `pnpm test` — 19 files, 58 tests | PASS |
| Source remains type- and lint-clean | `pnpm typecheck`, `pnpm lint` | PASS |

## Coverage and known gaps

`pnpm test:coverage` ran all 58 tests. Repository-wide coverage remains below its configured 80% threshold (64.97% lines); the largest existing gaps are in result normalization, hotspot localization, and product analysis. This feature's provider conversion and invalid-input paths are directly covered, but the repository-wide pre-existing gap remains follow-up work.

## Checkpoints

- RED: `ff72868 test: add real H viewport feed reproducer`
- GREEN: `58ef0b1 feat: render live H browser frames`
