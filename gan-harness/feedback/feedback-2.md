# Iteration 2 design evaluation

## Verdict

**Weighted score: 8.38/10 — passes the 7.5 threshold.**

Iteration two resolves the core density and interaction-model problems. Setup, persona selection, and observation are exclusive scenes; the live evidence is now composed directly on the observed viewport; completed findings are collapsed; and the full mobile live scene measures 853 px at 390×844 instead of the previous 1,602 px. The result feels like a focused usability observatory rather than a collection of report panels.

| Category | Score | Weight | Contribution |
| --- | ---: | ---: | ---: |
| Design Quality | 8.5 | 0.35 | 2.98 |
| Originality | 8.2 | 0.30 | 2.46 |
| Craft | 8.1 | 0.25 | 2.03 |
| Functionality | 9.2 | 0.10 | 0.92 |
| **Total** |  |  | **8.38** |

## Evidence

- Desktop setup at 1440×900: document height 900 px, setup present, live room absent.
- Desktop live at 1440×900: document height 907 px; setup and persona scenes absent; exactly one live room present.
- Mobile setup at 390×844: document height 844 px with no horizontal overflow.
- Mobile live at 390×844: document height 853 px and width 390 px; setup absent and exactly one live room present.
- `BASE_URL=http://127.0.0.1:3106 HAI_API_KEY= OPENAI_API_KEY= GRADIUM_API_KEY= NVIDIA_API_KEY= pnpm exec playwright test tests/e2e/run-flow.spec.ts --reporter=line`: **2 passed**.
- The revised tests explicitly verify setup/persona/live exclusivity, collapsed custom persona fields, suggested-roster semantics, replay mode, evidence overlays, compact findings, and mobile width.

## What improved

- Spoken thought and frustration are now contextual annotations inside the session surface. This is the biggest design improvement and gives the product a distinct point of view.
- The horizontal persona rail preserves agent switching without competing with the viewport. On mobile it becomes a compact avatar strip.
- “Evidence replay,” “H Company · replay,” “Gradium · review voice,” and “Run complete” clearly distinguish replay/review state from a live run. The stale “Ready to dispatch” contradiction is gone.
- The completed result is reduced to a single score, “View findings,” and a friction count instead of an always-expanded report strip.
- Persona cards now say “Included,” and the roster has accessible group semantics, making the tester-count relationship much clearer.
- The mobile frame is notably strong: the selected persona, observed page, heatmap markers, spoken thought, frustration callout, current action, and findings affordance are all visible within roughly one viewport.
- The editorial typography and restrained warm/mint/violet palette remain cohesive across all three scenes.

## Remaining issues

### 1. The replay viewport is still visibly synthetic

The centered skeleton page and generic “Primary action” are visually clean, but they still do not resemble direct product evidence. The new “Evidence replay” label makes this honest, yet a product-specific replay capture would make the central promise much more credible. For live H Company sessions, the actual Agent View/screenshot should replace this surface whenever technically possible.

### 2. Mobile annotations compete at the smallest width

At 390 px, the frustration callout covers much of the upper-right viewport and sits close to a heatmap marker, while the narration occupies most of the lower width. It is readable and still compact, but the underlying product can become secondary. Consider collapsing the non-selected annotation to a chip or letting the user toggle thought/frustration layers.

### 3. A little implementation copy remains user-facing

“Mock-first build: real H Company routes can swap in behind this contract” is internal implementation language and weakens the polished first impression. The authorization disclaimer is also repeated below a form that already contains the permission checkbox. Removing both would make the launch screen feel more intentional.

### 4. Fine interaction polish could go further

- The selected tester rail primarily communicates state through color and a subtle outline; a stronger accessible current marker would help.
- Provider status pills are informative now, but the live H Company state and direct Agent View action should be verified visually with a real-session fixture, not only replay mode.
- The desktop live page is 907 px tall at a 900 px viewport. The entire primary surface is effectively visible, but trimming a few pixels of shell spacing would eliminate the residual page scroll.
- Opening completed findings should preserve the same compact visual discipline; the collapsed state is strong, but the expanded drawer/sheet deserves a dedicated visual regression assertion.

## Recommended final polish

1. Remove the mock-build note and repeated permission footer from the launch scene.
2. Use a product-specific capture in replay and real Agent View evidence in live mode.
3. Add annotation-layer toggles or auto-collapse behavior on narrow mobile screens.
4. Trim desktop live spacing so the page height stays within 900 px.
5. Add visual coverage for expanded findings and a real-session fixture with the Agent View link.

## Final assessment

This iteration passes. It is genuinely less dense, intuitive within five seconds, responsive, and visually distinctive. The remaining work is polish and evidence fidelity rather than another structural redesign.
