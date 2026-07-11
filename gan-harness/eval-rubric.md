# GrannySmith design evaluation rubric

Score every category from 0–10, then compute the weighted total. Be severe: the core question is “Would this stand out in an award-level product gallery while still feeling production-ready?”

### Design Quality (weight: 0.35)

- Visual hierarchy and five-second comprehension
- Composition, typography, color, depth, and restraint
- Desktop and mobile art direction
- Cohesion between hero, evidence, insights, and footer
- Clear product credibility rather than decorative spectacle

### Originality (weight: 0.30)

- A memorable GrannySmith-specific visual signature
- Unusual but intelligible spatial or narrative choices
- Avoidance of generic gradient-SaaS and dashboard-template tropes
- Motion and data visualization that express the product concept

### Craft (weight: 0.25)

- Animation timing, easing, choreography, and state clarity
- Microinteraction polish, cursor behavior, glow discipline, and detail consistency
- Responsive behavior, overflow safety, and readable scale
- Reduced-motion behavior and semantic accessibility
- No visible rendering defects or browser console errors

### Functionality (weight: 0.10)

- Navigation and primary form remain usable
- Existing demo data and scoring narrative remain intact
- Reasonable bundle/performance discipline
- Tests, types, lint, and production build remain healthy

## Pass threshold

Weighted total must be at least **7.5 / 10**.

## Required evaluator output

Write `feedback/feedback-N.md` containing:

1. Screenshot sizes inspected
2. Category scores and weighted calculation
3. Weighted total on a line formatted `Weighted total: X.XX / 10`
4. Award-level verdict
5. Three strongest decisions
6. Up to five prioritized improvements
7. Any functionality, accessibility, overflow, or console defects
