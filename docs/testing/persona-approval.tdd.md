# Product-specific persona approval — TDD evidence

## User journeys

- As a researcher, I receive product-specific persona suggestions instead of the same visible identities for every product.
- As a researcher, I review the generated roster and explicitly accept it before any agents can be dispatched.
- As a researcher, my accepted roster and approval survive a reload of the same saved lab run.

## RED / GREEN

- RED: the focused run executed 66 tests and failed because the model prompt reused seed identities, persistence dropped acceptance, and no dispatch approval gate existed.
- GREEN: `pnpm test` passes 21 files and 68 tests after introducing product-specific identity instructions, explicit acceptance, persistence, and dispatch gating.

| Guarantee | Evidence | Result |
|---|---|---|
| Model is instructed to invent product-specific behavioral personas | `src/lib/product/analyze-product.test.ts` | PASS |
| Dispatch remains blocked before acceptance | `src/lib/ui/persona-approval.test.ts` | PASS |
| Accepted and authorized rosters can be dispatched | `src/lib/ui/persona-approval.test.ts` | PASS |
| Acceptance and the generated roster round-trip together | `src/lib/persistence/lab-state.test.ts` | PASS |
| Source passes lint and type checking | `pnpm lint`, `pnpm typecheck` | PASS |

## Coverage

Focused coverage for prompt generation, persona approval, and persistence: 89.28% statements, 86.66% branches, 100% functions, and 92.59% lines.

## Checkpoints

- RED: `b38917f test: add persona suggestion approval contract`
- GREEN: `7f9307b feat: approve and save generated personas`
- Refactor: `d592c88 refactor: isolate persona generation prompt`
