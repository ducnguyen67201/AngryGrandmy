# GAN Harness Design Report

**Brief:** Make GrannySmith radically simpler through mutually exclusive launch, persona, and observation scenes.

**Result:** PASS  
**Iterations:** 2 / 10  
**Final score:** 8.38 / 10

## Score progression

| Iteration | Design | Originality | Craft | Functionality | Weighted total |
|---|---:|---:|---:|---:|---:|
| 1 | 7.8 | 6.7 | 7.2 | 7.0 | 7.24 |
| 2 | 8.5 | 8.2 | 8.1 | 9.2 | 8.38 |

## Final design

- Launch, persona selection, and live observation are mutually exclusive scenes.
- The launch scene fits one desktop or mobile viewport and exposes only the current decision.
- Custom persona creation is collapsed behind “Add someone specific.”
- Live observation centers one session with a compact persona rail.
- Spoken thought, heatmap, frustration, and fix proposal are annotations on the session viewport.
- Completed findings collapse into a single summary row, especially on mobile.
- Live, replay, and completed provider states use consistent labels.

## Verification

- `pnpm typecheck` — PASS
- `pnpm lint` — PASS
- `pnpm test` — PASS, 50 tests
- `BASE_URL=http://127.0.0.1:3106 pnpm test:e2e` with provider keys unset — PASS, 2 tests
- Desktop setup: 900 px document height at 1440×900
- Desktop live: 907 px document height at 1440×900
- Mobile setup: 844 px document height at 390×844
- Mobile live: 853 px document height at 390×844, down from 1,602 px

## Remaining polish

- Replace the generic replay skeleton with a product-specific capture when one is available.
- Reposition overlays dynamically on very small viewports so they never cover the primary action.
- Visually verify real Agent View behavior and expanded findings with live provider data.
