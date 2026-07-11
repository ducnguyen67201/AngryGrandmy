# Iteration 1 design evaluation

## Verdict

**Weighted score: 7.24/10 — does not pass the 7.5 threshold.**

This is a substantial improvement over the supplied screenshot: setup, persona selection, and monitoring are now mutually exclusive scenes; the first screen fits at 1440×900 and 390×844 without scrolling; and the custom persona form is collapsed. The result is genuinely calmer. It is not yet design-award quality because the live experience is still a conventional dashboard composition wrapped around a generic fake browser, and mobile turns the observatory into a 1,602 px report stack.

| Category | Score | Weight | Contribution |
| --- | ---: | ---: | ---: |
| Design Quality | 7.8 | 0.35 | 2.73 |
| Originality | 6.7 | 0.30 | 2.01 |
| Craft | 7.2 | 0.25 | 1.80 |
| Functionality | 7.0 | 0.10 | 0.70 |
| **Total** |  |  | **7.24** |

## What works

- Progressive disclosure is now unmistakable. Setup disappears before persona selection, and both disappear in the live room.
- The launch scene has a single focal point, one short sentence, two inputs, presets, permission, and one primary action. Its measured document height is exactly 900 px at 1440×900 and 844 px at 390×844.
- The editorial serif display face, off-white field, small violet kicker, mint status, and restrained borders feel cohesive and significantly less tool-like.
- Persona selection is compact and understandable. “Add someone specific — e.g. my grandma” is visible without exposing the form.
- The desktop live screen keeps one agent viewport dominant and integrates thoughts/frustration more tightly than the old multi-card wall.
- Manual replay interaction succeeded for analyze, dispatch, persona selection, voice control visibility, heatmap visibility, and fix-agent control, with all provider keys explicitly unset.

## Main issues

### 1. The live surface still looks like a dashboard, not an observatory

The desktop composition is a familiar two-column admin layout: browser mock on the left, stacked “Testers / Speaking aloud / Frustration signal” modules on the right, then a KPI strip below. It is clean, but not original. The rubric asks for thoughts, heatmap, and fixes to feel like annotations on the live session; here they remain separately boxed report regions.

The browser content is also generic skeleton UI with a “Primary action” button. That weakens the core promise of direct H Company evidence. The user asked to see what agents are actually running; a stylized placeholder makes the most important area feel simulated even when the surrounding status says live.

### 2. Mobile is still too much

The live document is 1,602 px tall at 390×844. After the viewport, all four testers, spoken thought, frustration, score, hotspot count, recommendation, exports, replay status, and legal footer are stacked in full. This recreates the density problem vertically. Only the current agent and current evidence should be expanded; peers and completed-report details need compact, progressive disclosure.

The selected agent does not remain the focal point once the user scrolls. The four-person list consumes a large block even though a horizontal avatar rail or compact dropdown would do the job.

### 3. Evidence hierarchy is internally inconsistent

The run is labeled “Run complete,” but the experience still offers “Hear with Gradium” and “Spawn fix agent” as if it were live. That can be valid, but the UI does not distinguish replay/post-run actions from real-time observation.

“Ready to dispatch” remains in the desktop header after the run is complete. This is stale state and visibly contradicts the run heading.

The result strip is shown immediately after completion and competes with the live surface. The brief says report/export details should remain hidden until completion and compact; the timing is correct, but all metrics and exports are still expanded by default.

### 4. Some interaction craft is under-specified

- Persona cards visually indicate selection but do not expose `aria-pressed` or a radio-group relationship.
- The custom persona affordance is clear visually, but the suggested persona cards use checkmarks that imply all four are individually selected while tester count separately determines how many run. The relationship between card selection and count is ambiguous.
- Provider badges are decorative labels rather than useful live-state indicators. “H Company” should communicate connected/running/replay, and the Agent View link should remain visible even when the selected action label is long.
- The persistent mock-build status and repeated authorization footer add low-value text after the user has already granted permission.

### 5. Automated flow verification is currently stale

`BASE_URL=http://127.0.0.1:3105 pnpm exec playwright test tests/e2e/run-flow.spec.ts --reporter=line` failed because the test still expects the removed `Usability test workflow` list. The manual replay flow works, but the acceptance criterion explicitly requires Playwright replay mode, so this iteration cannot receive full functionality credit until the E2E contract matches the new progressive-disclosure UI.

## Prioritized changes for iteration 2

1. **Turn evidence into overlays on the session.** Place the spoken thought as a small anchored caption near the cursor/current action and render frustration as an expandable hotspot callout on the viewport. Replace the permanent right-side thought/frustration modules with one slim timeline or evidence rail.
2. **Make the live viewport credible.** Use the real Agent View/embed/screenshot when available. In replay, label the frame explicitly as “Replay” and use a recognizable product-specific capture rather than a neutral skeleton.
3. **Collapse mobile aggressively.** Use a horizontal tester rail, show only the selected tester’s thought, and collapse the completed score/fix/export area behind one “View findings” control. Target no more than roughly 1.2 viewports before the primary live evidence and its action are fully understood.
4. **Resolve state contradictions.** Header status should read “Run complete” after replay completion; provider chips should expose live/replay state; post-run voice/fix actions should be framed as review actions.
5. **Clarify tester selection.** Either make persona cards true multi-select controls and derive the count, or present them as an ordered suggested roster with the first N visibly included. Add accessible selection semantics.
6. **Remove low-value copy.** Hide the mock-first implementation note from the user-facing UI and avoid repeating the permission disclaimer on every scene.
7. **Update the E2E test** to assert the three exclusive scenes and verify that setup is absent in the live room, then cover the collapsed custom persona flow and mobile overflow.

## Pass criteria for the next iteration

- Desktop retains the calm, single-scene setup and persona screens.
- Live thoughts and frustration are perceived as part of the observed session, not as report cards beside it.
- Mobile no longer expands the entire tester list and completed report by default.
- Live/replay/completed state is consistent in every status label.
- The revised Playwright replay test passes with provider keys unset.
