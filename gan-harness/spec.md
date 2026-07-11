# Brief: make GrannySmith radically simpler

The current UI is still too dense. Redesign it so a first-time user immediately understands and completes this flow:

1. Enter a website and a short use case.
2. Analyze and receive suggested target-user personas, with an optional custom persona such as a grandma.
3. Choose how many testers to run.
4. Dispatch and observe the test.
5. Watch one persona use the product while speaking aloud; see live H Company state, a direct session link, heatmap/frustration signals, and a compact path to a coding-agent fix proposal.

## Core design constraint

Only show the controls needed for the current step. Setup and live monitoring must not appear side-by-side. The active task should fit comfortably in one viewport at 1440×900 without feeling like a dashboard.

## Desired interaction model

- Before analysis: one calm, centered launch card containing URL, use case, and one primary action.
- After analysis: replace the launch card with a compact persona picker; custom persona creation is collapsed by default.
- During/after dispatch: replace setup with the live test room; keep a small “New test” action.
- Show one selected agent viewport, not four large agent cards.
- A slim persona switcher may sit beside or below the viewport.
- Frustration and spoken thought should feel like annotations on the live session, not separate report panels.
- Hide report/export details until the run completes; keep them compact.

## Visual direction

Quiet, editorial, product-grade. Warm off-white background, near-black type, restrained mint signal color, occasional violet for AI actions. Strong typography and generous negative space. No giant marketing hero, no dense explanatory copy, no repeated headings, no nested cards inside cards, and no long forms visible before they are needed.

## Preserve

- Existing API behavior and safety authorization.
- Persona suggestion/custom persona capability.
- Tester count selection.
- H Company session status and Agent View link.
- Gradium voice action.
- Heatmap/friction markers.
- Fix brief interaction.
- Responsive and accessible behavior.

## Acceptance

- The first screen has no more than one heading, one short supporting sentence, two inputs, presets, permission, and one primary button.
- Custom persona fields are hidden until requested.
- The live screen does not show the setup form.
- The primary flow works in Playwright replay mode.
- Visual hierarchy is obvious within five seconds.
