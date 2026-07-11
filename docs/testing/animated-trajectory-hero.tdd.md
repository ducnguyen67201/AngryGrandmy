# Animated trajectory hero — TDD evidence

## Source and journey

No plan file was supplied. The journey was derived from the landing-page request: a prospective customer can understand that GrannySmith runs four synthetic usability personas, see an animated step-by-step trajectory, identify each persona and result, and use the primary URL call to action without relying on motion.

## RED → GREEN evidence

| Behavior | RED evidence | GREEN evidence | Guarantee |
|---|---|---|---|
| The trajectory visualization exists and is labeled for assistive technology | `pnpm test -- src/components/animated-agent-journey.test.tsx` failed because `./animated-agent-journey` did not exist | The same target passed as part of 15/15 tests | The hero exposes a named region, live status, step progress, and persona results |
| Progress animation respects user preferences | Missing component at RED | Component tests cover progression and reduced-motion behavior | The step counter advances normally and remains still under reduced motion |
| Session gaps degrade safely | Missing component at RED | Component test verifies all personas display `Queued` without session data | The hero remains readable before live session events arrive |

## Verification

| Check | Command | Result |
|---|---|---|
| Component and project tests | `pnpm test:coverage` | PASS — 15/15 tests |
| Coverage | `pnpm test:coverage` | PASS — 94.7% statements, 80% branches, 97.95% functions, 94.44% lines |
| Types | `pnpm typecheck` | PASS |
| Lint | `pnpm lint` | PASS |
| Production build | `pnpm build` | PASS — static `/` generated |
| Visual QA | Playwright screenshots at 1440×900 and 390×844 | PASS — desktop and mobile layouts inspected |

## Known gaps

The hero uses synthetic browser-card representations rather than real H Company screenshot events. Its component contract is ready for live snapshot/session data when the backend stream is connected.
