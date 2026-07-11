# Calibrated behavioral proxy TDD evidence

## Source and user journeys

The journeys were derived from the requested “Grandma once, test forever” capability:

1. As a researcher, I can record or upload a consented human usability session so that observable behavior can calibrate future tests.
2. As the responsible reviewer, I must edit and explicitly approve extracted rules before a calibrated proxy can run.
3. As a product team, I can dispatch the approved proxy through the existing H Company panel and compare reproduced friction types with the human baseline.
4. As an operator, I can queue a NemoClaw regression investigation that is host-scoped, read-only, and proposal-only.

## RED and GREEN evidence

- Domain RED: `pnpm vitest run src/lib/calibration/calibration.test.ts src/lib/calibration/build-profile.test.ts src/lib/calibration/create-calibrated-persona.test.ts src/lib/calibration/calculate-overlap.test.ts src/lib/integrations/nemoclaw.test.ts` failed because the five production modules did not exist.
- Domain GREEN: the same command passed 5 files and 10 tests.
- Ingestion RED: repository, NVIDIA adapter, and calibration route suites failed because their implementations did not exist.
- Ingestion GREEN: `pnpm vitest run src/lib/calibration/repository.test.ts src/lib/integrations/nvidia-calibration.test.ts src/app/api/calibrations/route.test.ts` passed 3 files and 7 tests at that stage.
- Review RED: calibration review route and studio component suites failed because their implementations did not exist.
- Review GREEN: the same targets passed 2 files and 4 tests.
- Lab loop RED: the lab integration module and durable NemoClaw queue were missing.
- Lab loop GREEN: `pnpm vitest run src/lib/calibration/lab-integration.test.ts src/lib/integrations/nemoclaw.test.ts` passed 2 files and 4 tests.
- Upload hardening RED: a WebM MIME type containing plain text was accepted.
- Upload hardening GREEN: `pnpm vitest run src/app/api/calibrations/route.test.ts` passed all 3 tests after signature validation.

## Test specification

| # | Guarantee | Test target | Type | Result |
|---|---|---|---|---|
| 1 | Both consent statements and a public HTTP(S) target are mandatory | `calibration.test.ts` | Unit/security | PASS |
| 2 | An approved profile requires a human approval timestamp | `calibration.test.ts` | Unit | PASS |
| 3 | Behavior rules and trust boundaries derive from explicit notes and timestamped evidence | `build-profile.test.ts` | Unit | PASS |
| 4 | Unapproved profiles cannot become H Company personas | `create-calibrated-persona.test.ts` | Unit/security | PASS |
| 5 | Overlap reports observable evidence coverage and never invents a score without evidence | `calculate-overlap.test.ts` | Unit | PASS |
| 6 | Profiles and media are stored under generated identifiers with private permissions | `repository.test.ts` | Integration/security | PASS |
| 7 | NVIDIA responses are schema-validated and malformed output falls back safely | `nvidia-calibration.test.ts` | Integration | PASS |
| 8 | Uploads require supported types, bounded size, and matching media signatures | `api/calibrations/route.test.ts` | API/security | PASS |
| 9 | A reviewer can edit and explicitly approve or reject the proxy | `calibrations/[id]/route.test.ts`, `calibration-studio.test.tsx` | API/component | PASS |
| 10 | An approved proxy joins a maximum-five-person panel and final evidence maps to overlap types | `lab-integration.test.ts` | Unit | PASS |
| 11 | NemoClaw jobs are domain-scoped, read-only, proposal-only, and durable without a configured runtime | `nemoclaw.test.ts` | Unit/integration/security | PASS |

## Security and known deployment gaps

- Raw media is never included in H Company or NemoClaw prompts. Only reviewed rules and bounded evidence summaries are dispatched.
- Uploads are capped at 25 MB, limited to MP4/WebM, checked by content signature, same-origin checked in browsers, and locally rate-limited.
- Local records, media, and jobs use mode `0600` and live under ignored `.grannysmith/` paths by default.
- The current storage and rate limiter are intentionally single-instance and local-first. A multi-user deployment still requires authentication, per-user authorization, durable object storage, retention/deletion controls, and a distributed rate limiter.
- NVIDIA VSS is optional and operator-hosted. Nemotron frame analysis and a deterministic review fallback preserve the demo when VSS is absent.
- “Behavior overlap” measures matching observable event types. It is not a scientific personal-similarity score.

## Final validation

- `pnpm test` — PASS, 41 files and 137 tests.
- `pnpm typecheck` — PASS.
- `pnpm lint` — PASS.
- `pnpm build` — PASS; `/calibrate`, `/api/calibrations`, `/api/calibrations/[id]`, and `/api/calibrations/[id]/regression` are present in the production route manifest.
- `BASE_URL=http://127.0.0.1:3100 pnpm test:e2e` against a dedicated heuristic-only production server — PASS, 4 Chromium journeys including the calibration consent gate and mobile replay.
- `pnpm test:coverage` — all 137 tests PASS, but the repository-wide threshold remains unmet at 72.79% lines, 70.37% statements, 79.25% functions, and 60.73% branches. The new `lib/calibration` domain is 96.33% lines and 92.18% statements; older broad modules such as result normalization, product analysis, and hotspot localization account for most of the global gap.

## Checkpoints

- `097ba4b` — RED domain contract
- `d3c3146` — GREEN calibrated behavior domain
- `8c23552` — RED secure ingestion contract
- `8d135cc` — GREEN ingestion and NVIDIA adapter
- `81b8b78` — RED review journey
- `77e79a6` — GREEN calibration studio
- `9538490` — RED calibrated regression loop
- `3f849a3` — GREEN calibrated regression loop
- `acd9753` — RED spoofed-media test
- `35b3ab2` — GREEN media hardening
