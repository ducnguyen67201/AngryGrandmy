# Simplified usability flow — TDD evidence

## Source

Journeys were derived from the requested website → personas → dispatch → observe → fix workflow.

## User journeys

- A product owner can enter a website and use case, then analyze it before dispatching agents.
- A product owner can choose suggested personas, add a custom target user, and choose the tester count.
- A product owner can observe live provider state, hear the persona's thought, inspect heatmap signals, and turn frustration into a fix brief.

## Evidence

| Guarantee | Test or command | Type | Result |
|---|---|---|---|
| Suggested personas can prefill a low-confidence older-adult tester | `src/components/persona-builder.test.tsx` | Component | PASS |
| The five-step setup and live-room flow completes in replay mode | `BASE_URL=http://127.0.0.1:3003 pnpm test:e2e` | E2E | PASS (1 test) |
| Existing application behavior remains green | `pnpm test -- src/components/persona-builder.test.tsx` | Unit/integration | PASS (50 tests) |
| Type contracts remain valid | `pnpm typecheck` | Static | PASS |
| Source passes lint rules | `pnpm lint` | Static | PASS |
| Production output compiles and prerenders | `pnpm build` | Build | PASS |

## RED / GREEN

- RED: the new suggestion test failed because no “Grandma new to apps” control existed.
- GREEN: suggestion buttons now prefill name, description, and digital confidence; all 50 tests pass.
- E2E was run with provider keys unset so validation remained deterministic and did not dispatch external sessions.

## Coverage and known gaps

`pnpm test:coverage` could not start because `@vitest/coverage-v8` is listed in `package.json` but missing from the installed dependency tree. The ordinary Vitest suite, lint, typecheck, production build, and Playwright flow all pass. The “Spawn fix agent” interaction currently prepares the evidence-backed fix brief in the UI; connecting it to a coding-agent orchestration backend remains a separate integration.
