# GrannySmith production animation brief

Elevate the existing GrannySmith landing page into a production-scale, design-award-caliber animated product experience while preserving its synthetic usability-testing story and existing demo data.

## Product story

GrannySmith releases four computer-use personas into an authorized product, watches their live screenshot trajectories, gives their friction a voice, and returns evidence-backed product recommendations.

## Visual direction

- Preserve the dark midnight, electric blue, violet, mint, amber, and coral identity.
- Make the experience feel authored and cinematic rather than template-like.
- Treat the hero journey as a living system: independent in-window cursors, ambient depth, purposeful sequencing, and clear cause-and-effect.
- Push scale with layered spatial composition, premium typography, restrained glow, high-contrast data moments, and tactile microinteractions.
- Do not copy TraceView branding or exact composition.

## Required production qualities

- Strong desktop composition at 1440×900 and deliberate mobile composition at 390×844.
- Motion should communicate state, hierarchy, and progress—not become visual noise.
- Respect `prefers-reduced-motion` and keep content usable without animation.
- Maintain semantic navigation, headings, form labels, and meaningful live-region/trajectory labels.
- Avoid external tracking, credentials, private data, and unnecessary dependencies.
- Keep the existing deterministic report/demo contract ready for future live H Company events.
- No broken layout, horizontal overflow, unreadably small essential text, or animation-driven content loss.
- Do not run `pnpm build` while the development server is active; this corrupts the shared `.next` output. Stop dev first for production build verification, then restart it.

## Creative ambition

The landing page should feel like a control room for autonomous UX research, not a collection of SaaS cards. Seek one memorable visual signature that belongs specifically to GrannySmith. A visually bold partial leap is preferable to a generic but feature-complete redesign.

## Acceptance

- The animated hero explains the product within five seconds.
- Each browser window visibly feels computer-controlled.
- The transition from live trajectory to evidence/report feels like one continuous narrative.
- Desktop and mobile both feel intentionally art-directed.
- Weighted evaluator score reaches at least 7.5/10.
