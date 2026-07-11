# Custom persona flow — TDD evidence

## Source and user journey

No external plan file was used. The journey was derived from the request:

> As a GrannySmith user, I want to describe and create a custom persona so that an H Company computer-use agent tests my product from that perspective.

## RED → GREEN report

| Stage | Command | Evidence |
|---|---|---|
| RED | `pnpm test -- src/lib/personas/create-custom-persona.test.ts src/components/persona-builder.test.tsx src/lib/schemas/run.test.ts` | Failed because the persona builder and constructor did not exist, the product schema rejected a fifth persona, and the request schema discarded `customPersona`. |
| GREEN | `pnpm exec vitest run src/lib/personas/create-custom-persona.test.ts src/components/persona-builder.test.tsx src/lib/schemas/run.test.ts` | 3 files passed; 12 tests passed. |
| Regression | `pnpm test` | 15 files passed; 41 tests passed. |
| Static checks | `pnpm typecheck` and `pnpm lint` | Both completed successfully. |
| Production | `pnpm build` | Next.js production build completed successfully; all 11 routes generated. |

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | A plain-language description becomes a validated, structured H-ready persona. | `src/lib/personas/create-custom-persona.test.ts` | Unit | PASS |
| 2 | Blank and excessively long descriptions are rejected. | `src/lib/personas/create-custom-persona.test.ts` | Unit | PASS |
| 3 | The builder collects name, description, and digital confidence and announces creation. | `src/components/persona-builder.test.tsx` | Component | PASS |
| 4 | Persona creation is unavailable until a product panel exists. | `src/components/persona-builder.test.tsx` | Component | PASS |
| 5 | Product and request schemas accept one custom persona in addition to the four generated personas. | `src/lib/schemas/run.test.ts` | Unit | PASS |
| 6 | The real H session request contains the custom persona context and strict JSON response instructions. | `src/lib/integrations/h-company.test.ts` | Integration | PASS |

## Coverage and known gaps

`pnpm test:coverage` executed all 41 tests successfully. Feature coverage is strong:

- `src/components/persona-builder.tsx`: 100% lines and functions
- `src/lib/personas/create-custom-persona.ts`: 100% statements, lines, and functions

The command exits non-zero because repository-wide coverage is 58.52% lines / 67.87% functions, below the pre-existing global 80% threshold. The uncovered code is primarily older result-normalization, hotspot-localization, product-analysis, and provider integration paths; it is not introduced by this feature.

## Checkpoints

- RED: `d01890c test: define custom persona creation flow`
- GREEN: `dfa8afa feat: add custom persona dispatch`
