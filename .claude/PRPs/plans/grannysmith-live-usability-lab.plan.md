# Plan: GrannySmith Live Synthetic Usability Lab

## Summary

Build a greenfield hackathon application that accepts an authorized website URL, uses H Company models to understand the product and generate four behaviorally distinct personas/tasks, then launches four H computer-use browser sessions in parallel. A live React Three Fiber “testing lab” visualizes each persona as a 3D character at a workstation, Gradium voices selected persona observations, and a deterministic evaluator produces an evidence-backed Human-Friendly Score, friction hotspots, replay links, and a before/after comparison.

The implementation is deliberately optimized for a reliable 90-second live demo: H Company is on the critical path, Gradium TTS is a bounded enhancement, the 3D scene degrades to a 2D lab, and all sponsor/stretch work is gated behind a complete end-to-end run.

## User Story

As a product builder, I want to dispatch a synthetic panel of realistic first-time users against my website, so that I can watch where they struggle and receive prioritized usability fixes before recruiting human participants.

## Problem → Solution

Product teams know their own terminology and happy paths, so internal testing misses confusion experienced by low-confidence, distracted, accessibility-constrained, or cautious users. → Paste an authorized URL, automatically create a diverse synthetic panel, watch H agents interact with the product, hear explicit persona observations through Gradium, and receive a reproducible score with trajectory evidence.

## Metadata

- **Complexity**: XL
- **Source PRD**: N/A
- **PRD Phase**: N/A (standalone greenfield build)
- **Estimated Files**: 42 core files plus generated lockfile
- **Estimated Tasks**: 12
- **Primary Track**: Track 2 — Browser Use
- **Side Challenge**: Gradium Voice Challenge
- **Conditional Side Challenge**: NVIDIA NemoClaw, only after mentor confirmation and core-demo freeze
- **Package Manager**: pnpm
- **Deployment Target**: AWS Amplify Hosting, pinned to Next.js 15 because current Amplify documentation supports Next.js through v15

---

## Locked Product Decisions

1. **Product name**: GrannySmith. “Grandma” is the memorable flagship, but the product is presented as a synthetic usability panel rather than an age stereotype.
2. **Core experience**: URL → product understanding → four generated personas/tasks → four parallel H sessions → live 3D lab → score/report.
3. **Persona design**: Personas are defined through observable behavioral constraints (digital confidence, vocabulary, retry limits, visual/motor context, trust threshold), not “old people are bad at technology.”
4. **3D approach**: One procedurally modeled low-poly character rig rendered four times with different clothes, hair, glasses, posture, and voice. This avoids licensing, rigging, and asset-download risk while still delivering real interactive 3D.
5. **3D lab scope**: Four seated testers, four monitor surfaces, state-driven animations, camera focus, status lighting, selected-persona audio, and an end-of-run top-down reveal. No open-world navigation or general-purpose character controller.
6. **Monitor content**: Always show session status, current action label, task, and H Agent View link. Render a live screenshot only if H event/resource payloads expose a stable retrievable image during the hackathon; screenshots are not a core dependency.
7. **Voice**: Gradium stock/library voices only for MVP. No real-person voice cloning. Selected persona only; other voices remain muted.
8. **Narration**: Speak only explicit generated persona introductions, deterministic event-derived quips, and structured `narratedObservation` findings. Never vocalize hidden model reasoning or raw chain-of-thought.
9. **Scoring**: Deterministic TypeScript formula. Model output supplies evidence; the model does not invent the final numeric score.
10. **Persistence**: Stateless server routes and browser-side run snapshots in `sessionStorage`/downloadable JSON for the hackathon. No database in the core build.
11. **Safety**: The user must attest that they own or are authorized to test the site. Agents use synthetic data, stop before irreversible actions, and never purchase, send, publish, delete, book a real appointment, or submit sensitive information.
12. **Demo resilience**: A prerecorded/replayable fixture run uses the exact same UI state model as live runs. “Demo mode” is visibly labeled and is a fallback, not passed off as live.

---

## UX Design

### Before

```text
┌──────────────────────────────────────────────┐
│ Product team manually writes usability tasks │
│ Recruits users or asks teammates to test      │
│ Watches recordings one at a time              │
│ Manually consolidates subjective feedback     │
└──────────────────────────────────────────────┘
```

### After

```text
┌────────────────────────────────────────────────────────────┐
│ GrannySmith                                                │
│ [ https://authorized-demo.example ] [Release the Panel]   │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Persona reveal: Linda · Rosa · Mei · Joan              │
│ Four goals, four behavioral profiles, four voices          │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────┬─────────────────────┐
│ LIVE 3D TESTING LAB                  │ Focused tester      │
│                                      │ Linda · Step 7      │
│   👵🖥️    👵🖥️    👵🖥️    👵🖥️     │ “I don't know what  │
│  amber   green   amber    red       │ this label means.”  │
└──────────────────────────────────────┴─────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ HUMAN-FRIENDLY SCORE 54/100                                │
│ 2/4 completed · 3 shared hotspots · replay evidence     │
│ Top fix: replace “Care modality” with plain language       │
└────────────────────────────────────────────────────────────┘
```

### Interaction Changes

| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Test setup | User manually specifies personas and tasks | User supplies URL plus optional spoken/written objective | H model returns structured product/profile analysis |
| Authorization | Implicit | Required ownership/authorization checkbox | Block start until attested |
| Persona creation | Manual | Four behaviorally distinct personas generated automatically | User can inspect but MVP does not include a full persona editor |
| Test execution | Sequential/manual | Four H browser sessions launch concurrently or queue to quota | UI distinguishes queued, running, terminal |
| Observation | Browser recordings | Live 3D lab with state-driven character reactions | 2D fallback for WebGL/reduced-motion |
| Voice | None | Selected persona introduces herself and voices explicit observations | Never play multiple voices simultaneously |
| Evaluation | Subjective notes | Deterministic score plus structured evidence | Always disclose “synthetic benchmark” |
| Replay | Separate tools | Deep-link to H Agent View for each persona | Screenshot texture optional |
| Failure recovery | Restart manually | Retry failed persona, cancel run, or switch to labeled fixture replay | Preserve completed sessions |

---

## Visual State Contract

The UI and 3D scene consume a single normalized state machine. H event payloads must be translated once in `lib/h-company/event-normalizer.ts`; components never inspect raw H payloads.

| Normalized state | 3D animation | Desk/monitor treatment | Allowed narration |
|---|---|---|---|
| `queued` | seated idle | neutral, queue position | persona introduction once |
| `launching` | wakes/leans forward | boot animation | none |
| `reading` | scans monitor | soft active pulse | no hidden reasoning |
| `navigating` | hand-to-mouse | action label | deterministic “I’m trying the next page.” only if useful |
| `typing` | typing loop | masked generic input label | never narrate typed values |
| `backtracking` | head shake + mouse | amber trail | deterministic “I’m going back; that wasn’t what I expected.” |
| `confused` | pause/scratch head | amber beacon | structured explicit observation only |
| `blocked` | raises hand | red beacon | structured reason or safe generic message |
| `succeeded` | restrained celebration | green portal | structured success summary |
| `abandoned` | closes laptop/sits back | red/gray station | structured abandonment reason |
| `failed` | concerned idle | technical error state | generic technical failure, not persona blame |

Unknown event types map to `reading` and are logged as redacted debug metadata. They never crash the scene.

---

## Data Contracts

All contracts live in `lib/schemas/run.ts` as Zod schemas with inferred TypeScript types.

### `AnalyzeRequest`

```ts
{
  url: string;                 // http/https, no credentials/private networks
  objective?: string;          // 0..500 chars
  authorizationConfirmed: true;
}
```

### `ProductAnalysis`

```ts
{
  productName: string;
  productCategory: string;
  summary: string;
  primaryFlows: Array<{
    name: string;
    goal: string;
    safeStopPoint: string;
  }>;
  globalSafetyBoundaries: string[];
  personas: [PersonaScenario, PersonaScenario, PersonaScenario, PersonaScenario];
}
```

### `PersonaScenario`

```ts
{
  id: string;
  displayName: string;
  tagline: string;
  context: string;
  digitalConfidence: "low" | "medium" | "high";
  behaviors: string[];
  accessibilityContext: string[];
  trustBoundaries: string[];
  task: string;
  successCriteria: string[];
  stopConditions: string[];
  expectedStepBudget: number;  // 4..30
  introLine: string;           // explicit TTS-safe line
  voiceSlot: 0 | 1 | 2 | 3;
  visualVariant: 0 | 1 | 2 | 3;
}
```

### `AgentFinding`

```ts
{
  completion: "success" | "partial" | "abandoned" | "blocked";
  summary: string;
  evidence: string[];
  frictionEvents: Array<{
    step: number;
    category: "navigation" | "clarity" | "feedback" | "recovery" | "trust" | "accessibility" | "technical";
    severity: 1 | 2 | 3 | 4 | 5;
    observation: string;
    visibleEvidence: string;
    recommendation: string;
    narratedObservation: string; // explicit user-style speech, max 180 chars
    recovered: boolean;
  }>;
  safeStopReached: boolean;
}
```

### `NormalizedSession`

```ts
{
  sessionId: string;
  personaId: string;
  status: "queued" | "pending" | "running" | "paused" | "completed" | "timed_out" | "interrupted" | "failed";
  visualState: VisualAgentState;
  eventCursor: number;
  stepCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  agentViewUrl: string | null;
  outcome: "success" | "failure" | "unknown";
  latestActionLabel: string | null;
  finding: AgentFinding | null;
  errorCode: string | null;
}
```

### `UsabilityReport`

```ts
{
  score: number;
  dimensions: {
    completion: number;  // 0..40
    efficiency: number;  // 0..20
    clarity: number;     // 0..15
    recovery: number;    // 0..15
    trust: number;       // 0..10
  };
  completedCount: number;
  sharedHotspots: SharedHotspot[];
  topRecommendations: string[];
  disclosure: "Synthetic usability benchmark; not a replacement for human research or accessibility certification.";
}
```

---

## Deterministic Scoring Contract

Calculate each dimension in pure functions and round only the final total.

1. **Completion (40)**
   - Map each persona: success `1`, partial `0.5`, blocked/abandoned `0`.
   - `40 * mean(personaCompletion)`.
2. **Efficiency (20)**
   - For each persona: `clamp(expectedStepBudget / max(actualSteps, expectedStepBudget), 0, 1)`.
   - Abandoned/blocked personas are capped at `0.4` even if they used few steps.
   - `20 * mean(personaEfficiency)`.
3. **Clarity (15)**
   - Consider `clarity`, `navigation`, and `feedback` friction.
   - Per persona penalty: `min(1, sum(severity) / 15)`.
   - `15 * (1 - mean(penalty))`.
4. **Recovery (15)**
   - With no nontechnical friction, award `15`.
   - Otherwise `15 * recoveredFrictionCount / nontechnicalFrictionCount`.
5. **Trust (10)**
   - Begin at `10`; subtract `2 * severity` for trust friction, capped at 10, averaged across personas.
6. **Technical failures**
   - API/network/model failures do not count as user-facing usability failures. Mark the run incomplete and exclude affected persona from the product score until retried.
7. **Shared hotspot clustering**
   - Normalize category plus lowercase alphanumeric tokens from `visibleEvidence`.
   - Cluster only findings with the same category and token Jaccard similarity `>= 0.45`.
   - Rank by `personaCount * maxSeverity`, then severity, then earliest step.

Unit tests must freeze these formulas with fixture inputs.

---

## Architecture

```text
Browser UI (Next.js 15 / React 19)
  │
  ├─ URL + authorization + optional objective
  ├─ Zustand run state + sessionStorage snapshot
  ├─ React Three Fiber live lab + 2D fallback
  └─ Audio player + Web Audio lip amplitude
  │
  ▼ same-origin Route Handlers (Node runtime, no secrets in browser)
  ├─ POST /api/analyze
  │    └─ H Models API (OpenAI-compatible structured output)
  ├─ POST /api/sessions
  │    └─ H Computer-Use Agents API/SDK × 4
  ├─ GET /api/sessions/:id/changes?fromIndex=N
  │    └─ H long-poll changes/event stream
  ├─ DELETE /api/sessions/:id
  │    └─ H cancel
  └─ POST /api/voice
       └─ Gradium REST TTS, raw WAV response

Pure local modules
  ├─ raw H event → normalized session state
  ├─ structured findings → deterministic score
  └─ normalized state → 3D animation/audio policy
```

### Why stateless server routes

The browser owns the run ID, persona specs, H session IDs, cursors, and normalized state. Route handlers only validate, call upstream APIs, redact failures, and return data. This avoids a database and avoids relying on server-process memory across AWS Amplify invocations.

### Alternatives Considered

| Alternative | Decision | Reason |
|---|---|---|
| One H manager agent with four subagents | Reject for core | Independent sessions are easier to display, retry, cancel, and score; H multi-agent remains useful as a later evaluator experiment |
| Full custom Holo browser loop | Reject for core | Duplicates browser harness work and increases 48-hour risk; use H managed computer-use sessions |
| True open-world 3D website map | Reject | High visual risk and weak demo reliability; four-station lab directly maps to parallel sessions |
| Downloaded/AI-generated rigged avatars | Reject for core | Licensing, topology, rigging, and loading risk; procedural low-poly characters are deterministic |
| Gradium browser WebSocket with API key | Reject | Exposes secret; use server-side REST TTS for short utterances |
| Custom WebSocket proxy | Stretch only | Better latency but complicates Next/AWS deployment; not required for short narration |
| Model-generated numeric score | Reject | Difficult to reproduce or defend; deterministic score is stronger technically |
| Database/S3 report persistence | Reject for core | Not needed for the live demo; downloadable fixture JSON and H replay links suffice |
| Next.js 16 | Reject for AWS target | Current AWS Amplify docs list support through Next.js 15 |

### Scope

- One polished single-page flow with landing, persona reveal, live lab, and report states.
- H product/persona analysis and four H managed browser sessions.
- Live long-poll event consumption with cancellation and retry.
- Real 3D characters and state-driven animations.
- Selected-persona Gradium TTS and amplitude-driven mouth animation.
- Deterministic scoring and shared-hotspot clustering.
- Labeled fixture replay fallback.
- Unit, component, contract, and one Playwright happy-path test.
- AWS Amplify deployment instructions and environment configuration.

## NOT Building

- A scientific simulation of age, cognition, disability, or population behavior.
- Accessibility certification, legal compliance certification, or a replacement for human user research.
- Real purchases, appointment submissions, account deletions, emails/messages, publication, or other irreversible actions.
- Testing sites without ownership or explicit authorization.
- Voice cloning without separately documented, explicit consent.
- Authentication, teams, billing, multi-tenant persistence, or a production analytics platform.
- A persona marketplace or full persona editor.
- Automatic source-code modifications or pull requests.
- A general-purpose 3D engine, VR mode, multiplayer world, or four unique rigging systems.
- Guaranteed embedded live browser screenshots; Agent View links are the reliable evidence surface.
- NemoClaw integration until an NVIDIA mentor confirms that H’s endpoint can be routed in a way that qualifies for the challenge.

---

## Repository Discovery

The repository was empty on 2026-07-11:

```text
/Users/ducng/Desktop/workspace/ComputerUseHackathon
└─ (no files, no .git directory)
```

There are therefore no existing implementations, naming rules, error patterns, logging conventions, types, tests, configuration, dependencies, entry points, data flows, or state changes to mirror. Implementation must bootstrap the conventions below; do not claim these were discovered from existing code.

### Unified Discovery Table

| Category | File:Lines | Finding | Implementation consequence |
|---|---|---|---|
| Similar implementations | N/A | None; repository empty | Use documented H frontend/API patterns and this plan’s contracts |
| Naming | N/A | None | Define kebab-case files, PascalCase React components/types, camelCase functions |
| Error handling | N/A | None | Establish `AppError` + redacted route-handler adapter |
| Logging | N/A | None | Establish structured server-only logger with secret/body redaction |
| Types | N/A | None | Zod schemas are source of truth; infer TypeScript types |
| Tests | N/A | None | Bootstrap Vitest + Testing Library + MSW + Playwright |
| Configuration | N/A | None | Bootstrap `.env.example`, typed environment loader, CSP headers |
| Dependencies | N/A | None | Pin stack in `package.json` and commit `pnpm-lock.yaml` |
| Entry points | N/A | None | Next App Router page and Route Handlers |
| Data flow | N/A | None | Stateless BFF routes; browser stores session IDs/cursors |
| State changes | N/A | None | Zustand reducer-style actions own run transitions |
| Contracts | N/A | None | Contracts defined in this plan and `lib/schemas/run.ts` |

---

## Greenfield Conventions to Establish

These are prescriptions for new code, not discovered repository patterns.

### NAMING_CONVENTION

```ts
// Files: kebab-case.ts / kebab-case.tsx
// React components and exported types: PascalCase
// Functions, hooks, values: camelCase
// Zod schema values: PascalCaseSchema
// Route modules export HTTP verbs: GET, POST, DELETE
export const PersonaScenarioSchema = z.object({ /* ... */ });
export type PersonaScenario = z.infer<typeof PersonaScenarioSchema>;
export function calculateUsabilityReport(input: ScoreInput): UsabilityReport { /* ... */ }
export function useSessionPolling() { /* ... */ }
```

### ERROR_HANDLING

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

// Route handlers parse unknown input, call a service, and pass errors through
// one redacting adapter. Client responses contain code/message/retryable only.
```

### LOGGING_PATTERN

```ts
logger.info("h_session_started", { runId, sessionId, personaId });
logger.error("upstream_request_failed", {
  provider: "h-company",
  code: appError.code,
  status: appError.status,
});
// Never log API keys, raw authorization headers, audio bytes, typed form data,
// raw page HTML, or complete upstream error bodies.
```

### STATE_PATTERN

```ts
type RunPhase = "idle" | "analyzing" | "revealing" | "running" | "report" | "error";

// Zustand actions are event-shaped and immutable:
setAnalysis(analysis);
attachSessions(sessionDescriptors);
applySessionChanges(sessionId, normalizedChanges);
selectPersona(personaId);
completeRun(report);
```

### SERVICE_PATTERN

```ts
// Route → validation → service/client → schema validation → response.
// Provider clients accept dependencies so tests can inject fetch mocks.
export function createHCompanyClient(options: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}) { /* ... */ }
```

### TEST_STRUCTURE

```ts
describe("calculateUsabilityReport", () => {
  it("does not penalize product usability for provider failure", () => {
    // arrange fixture, act, assert exact dimension values
  });
});
```

---

## Mandatory Reading

Because the repository is empty, these files will be created by earlier tasks and become mandatory reading for later tasks.

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `lib/schemas/run.ts` | all | Canonical API, state, finding, and report contracts |
| P0 | `lib/config/env.ts` | all | Server-only environment and public configuration boundary |
| P0 | `lib/security/url-policy.ts` | all | Authorization and URL/SSRF boundary for every run |
| P0 | `lib/h-company/client.ts` | all | H Models and Agents provider boundary |
| P0 | `lib/h-company/event-normalizer.ts` | all | Only module allowed to interpret raw H events |
| P0 | `lib/scoring/calculate-report.ts` | all | Deterministic scoring contract |
| P0 | `stores/run-store.ts` | all | Client state transitions and snapshot format |
| P1 | `lib/h-company/prompts.ts` | all | Persona/test safety and structured-output prompts |
| P1 | `components/lab/animation-policy.ts` | all | Normalized state to character/scene behavior |
| P1 | `lib/gradium/client.ts` | all | Secret-safe TTS integration |
| P1 | `tests/fixtures/h-session-events.ts` | all | Raw-event contract fixtures used to prevent UI/provider coupling |
| P2 | `README.md` | all | Setup, architecture, demo, safety, and limitations |

---

## External Documentation and Research Findings

| Topic | Source | Key takeaway |
|---|---|---|
| H Computer-Use Agents | https://hub.hcompany.ai/computer-use-agents/introduction | Managed agents see/click/type/scroll in cloud browsers; session API is the core execution path |
| H SDK | https://hub.hcompany.ai/computer-use-agents/sdks | TypeScript package is `hai-agents`; keep it server-only |
| H sessions | https://hub.hcompany.ai/computer-use-agents/sessions/overview | Sessions expose lifecycle, `agent_view_url`, structured answers, overrides, outcome, and limits |
| H observation/steering | https://hub.hcompany.ai/computer-use-agents/observe-and-steer | Use long-poll `changes`, cancel failed runs, and drain final events before reading answer |
| H parallel work | https://hub.hcompany.ai/computer-use-agents/multi-agent | Parallel child sessions exist, but independent top-level sessions suit the panel UI better |
| H Models API | https://hub.hcompany.ai/about-the-models-api | OpenAI-compatible Holo API supports text/images and structured output |
| H model quickstart | https://hub.hcompany.ai/quickstart | Base URL is `https://api.hcompany.ai/v1/`; use the fast model for planning unless quality requires the larger model |
| H agent loop | https://hub.hcompany.ai/agent-loop | Raw model structured output uses `extra_body.structured_outputs.json`; native OpenAI tool-calling can degrade Holo agent quality |
| Gradium TTS REST | https://docs.gradium.ai/api-reference/endpoint/tts-post | `POST /api/post/speech/tts`, `x-api-key`, `only_audio: true`, WAV bytes; ideal secret-safe MVP path |
| Gradium streaming | https://docs.gradium.ai/guides/text-to-speech | Streaming exists but requires authenticated WebSocket; do not expose key in browser |
| Gradium multiplexing | https://docs.gradium.ai/guides/multiplexing | One socket can multiplex requests; consider only after core if a server WebSocket proxy is added |
| React Three Fiber | https://r3f.docs.pmnd.rs/getting-started/introduction | Use `<Canvas>`, declarative meshes, pointer events, and `useFrame` for bounded animation |
| Next Route Handlers | https://nextjs.org/docs/app/getting-started/route-handlers | App Router Route Handlers use Web Request/Response APIs and are uncached by default |
| AWS Amplify Next SSR | https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html | Amplify SSR compute currently supports Next.js through 15; use `.next` as artifact directory |
| NVIDIA NemoClaw | https://docs.nvidia.com/nemoclaw/latest/user-guide/openclaw/home | Provides OpenShell sandboxing, policy, and inference routing; qualification of H endpoint integration requires mentor confirmation |

### Research Insights

```text
KEY_INSIGHT: H managed sessions provide independent lifecycle, event history,
Agent View links, structured answers, and queue behavior.
APPLIES_TO: Session orchestration and live lab.
GOTCHA: `completed` is not equivalent to product-task success; read structured
finding/outcome and drain the event stream.

KEY_INSIGHT: H session overrides can set start URL, instructions, limits, and
answer format without creating four permanent agents.
APPLIES_TO: Four-persona launch.
GOTCHA: Validate override paths against the live API immediately; beta API
details may change during the event.

KEY_INSIGHT: H Models API is OpenAI-compatible but its specialized structured
agent-loop format is not ordinary OpenAI function calling.
APPLIES_TO: Product/persona analysis.
GOTCHA: Use the documented structured output payload and validate every result
with Zod; retry once with a repair prompt, then fail clearly.

KEY_INSIGHT: Gradium REST TTS can return raw WAV bytes for complete short text.
APPLIES_TO: Persona introductions and findings.
GOTCHA: Keep the API key server-side, limit utterance length, and cache/dedupe
within the browser run to control credits.

KEY_INSIGHT: Gradium WebSocket gives lower first-audio latency and multiplexing.
APPLIES_TO: Stretch voice polish.
GOTCHA: Next/AWS WebSocket proxy deployment adds material complexity; never
connect from the browser with the long-lived API key.

KEY_INSIGHT: AWS Amplify SSR documentation currently supports Next.js up to 15.
APPLIES_TO: Framework version and deployment.
GOTCHA: Do not upgrade to Next 16 during the hackathon without first changing
the hosting plan.

KEY_INSIGHT: React Three Fiber makes state-driven scene updates straightforward.
APPLIES_TO: Four-persona lab.
GOTCHA: Avoid object allocation inside `useFrame`, cap device pixel ratio, and
provide a 2D fallback for low-power/WebGL-unavailable devices.
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `.gitignore` | CREATE | Ignore `.env*`, Next output, coverage, Playwright artifacts |
| `.env.example` | CREATE | Document H/Gradium keys, models, voice IDs, demo controls |
| `package.json` | CREATE | Pin Next 15/React 19 and scripts/dependencies |
| `pnpm-lock.yaml` | GENERATE | Reproducible dependency installation |
| `tsconfig.json` | CREATE | Strict TypeScript and `@/*` path alias |
| `next.config.ts` | CREATE | Security headers, Node route runtime compatibility |
| `eslint.config.mjs` | CREATE | Next/TypeScript linting |
| `vitest.config.ts` | CREATE | Unit/component environment and aliases |
| `playwright.config.ts` | CREATE | One-browser E2E configuration |
| `amplify.yml` | CREATE | AWS Amplify build using pnpm and `.next` output |
| `README.md` | CREATE | Setup, architecture, demo, consent, limitations, sponsor attribution |
| `app/layout.tsx` | CREATE | Root metadata and global shell |
| `app/page.tsx` | CREATE | Single-page phase orchestrator |
| `app/globals.css` | CREATE | Theme, responsive layout, reduced-motion/fallback styles |
| `app/api/analyze/route.ts` | CREATE | Validate URL/objective and call H Models API |
| `app/api/sessions/route.ts` | CREATE | Launch four bounded H sessions |
| `app/api/sessions/[id]/changes/route.ts` | CREATE | Proxy long-poll changes with cursor validation |
| `app/api/sessions/[id]/route.ts` | CREATE | Retrieve/cancel one H session |
| `app/api/voice/route.ts` | CREATE | Validate and proxy Gradium TTS as WAV |
| `lib/config/env.ts` | CREATE | Typed server-only env loader |
| `lib/api/app-error.ts` | CREATE | Stable error contract and redaction |
| `lib/api/route-handler.ts` | CREATE | Shared parse/handle/respond wrapper |
| `lib/logger.ts` | CREATE | Structured redacted server logs |
| `lib/security/url-policy.ts` | CREATE | Scheme/credential/private-network rejection |
| `lib/security/rate-limit.ts` | CREATE | Bounded demo limiter interface/local implementation |
| `lib/schemas/run.ts` | CREATE | Zod source of truth for all contracts |
| `lib/h-company/client.ts` | CREATE | H model/session SDK boundary |
| `lib/h-company/prompts.ts` | CREATE | Analysis and persona test prompts with safety boundaries |
| `lib/h-company/event-normalizer.ts` | CREATE | Raw H changes to normalized UI state |
| `lib/gradium/client.ts` | CREATE | Gradium REST TTS client |
| `lib/scoring/calculate-report.ts` | CREATE | Pure deterministic score calculation |
| `lib/scoring/cluster-hotspots.ts` | CREATE | Deterministic cross-persona issue clustering |
| `stores/run-store.ts` | CREATE | Zustand run state/actions and snapshot persistence |
| `hooks/use-session-polling.ts` | CREATE | Long-poll loop, cursor draining, retry/cancel cleanup |
| `hooks/use-narrator.ts` | CREATE | Selected persona audio queue and dedupe |
| `components/landing/run-form.tsx` | CREATE | URL/objective/authorization input |
| `components/personas/persona-reveal.tsx` | CREATE | Four-character reveal transition |
| `components/lab/live-lab.tsx` | CREATE | Canvas/2D fallback host and focused-persona panel |
| `components/lab/lab-scene.tsx` | CREATE | Camera, lights, four stations, final pullback |
| `components/lab/tester-station.tsx` | CREATE | Desk, monitor, beacon, persona selection |
| `components/lab/grandma-character.tsx` | CREATE | Procedural low-poly character and animations |
| `components/lab/animation-policy.ts` | CREATE | Pure visual-state to animation mapping |
| `components/lab/two-d-lab.tsx` | CREATE | Accessible fallback with equivalent information |
| `components/report/report-reveal.tsx` | CREATE | Score, dimensions, hotspots, recommendations, disclosure |
| `components/report/session-evidence.tsx` | CREATE | Per-persona outcomes and H Agent View links |
| `tests/fixtures/h-session-events.ts` | CREATE | Sanitized raw H event fixtures after first real smoke run |
| `tests/fixtures/complete-run.ts` | CREATE | Labeled fallback/replay dataset |
| `tests/unit/*.test.ts` | CREATE | URL policy, normalizer, scoring, clustering tests |
| `tests/components/*.test.tsx` | CREATE | Form, fallback lab, report, accessibility behavior |
| `tests/e2e/demo-flow.spec.ts` | CREATE | Mock-provider end-to-end happy path |

---

## Step-by-Step Tasks

### Task 1: Bootstrap the greenfield repository and quality harness

- **ACTION**: Initialize Git and create a pinned Next.js 15 TypeScript application using pnpm.
- **IMPLEMENT**:
  - Create `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `check`.
  - Runtime dependencies: `next@15`, `react@19`, `react-dom@19`, `zod`, `zustand`, `openai`, `hai-agents`, `three`, `@react-three/fiber`, `@react-three/drei`, `motion`.
  - Dev dependencies: TypeScript, Next ESLint config, `vitest`, `jsdom`, Testing Library, `msw`, Playwright, Three types.
  - Enable strict TypeScript, `noUncheckedIndexedAccess`, and `@/*` alias.
  - Add `.env.example`; never create a committed real `.env`.
  - Add `amplify.yml` with pnpm install/build and `.next` artifact output.
- **MIRROR**: Greenfield naming/test/config conventions in this plan.
- **IMPORTS**: N/A for configuration; application imports use `@/*`.
- **GOTCHA**: Pin Next.js 15 for current Amplify compatibility; do not let scaffolding silently install Next 16.
- **VALIDATE**: `pnpm install && pnpm typecheck && pnpm lint && pnpm build` all pass on the empty shell.

### Task 2: Establish schemas, environment, errors, logging, and security boundaries

- **ACTION**: Create all shared contracts and server safety utilities before provider code.
- **IMPLEMENT**:
  - Encode every contract from “Data Contracts” in Zod.
  - Load `HAI_API_KEY`, `HAI_AGENT_ID` (default `h/web-surfer-flash`), `HAI_MODEL_NAME` (default fast Holo model), `GRADIUM_API_KEY`, and four `GRADIUM_VOICE_*_ID` variables server-side.
  - URL policy: accept only `http:`/`https:`, reject embedded credentials, `localhost`, `.local`, raw/private/loopback/link-local IPs, and DNS resolutions to private/metadata ranges.
  - Require `authorizationConfirmed === true`.
  - Define agent safety constants: synthetic inputs only; stop before irreversible submission; never pay, send, publish, delete, or disclose secrets.
  - Create stable `AppError` codes (`INVALID_INPUT`, `UNAUTHORIZED_TARGET`, `UPSTREAM_RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `UPSTREAM_INVALID_RESPONSE`, `SESSION_NOT_FOUND`, `VOICE_UNAVAILABLE`, `INTERNAL_ERROR`).
  - Add generic client errors and detailed redacted server logs.
  - Add rate-limiter abstraction with an in-memory demo implementation; document that public multi-instance production requires a shared backend or AWS WAF.
- **MIRROR**: `ERROR_HANDLING`, `LOGGING_PATTERN`, and schemas in this plan.
- **IMPORTS**: `zod`, `node:dns/promises`, `node:net`, shared `AppError`.
- **GOTCHA**: The backend does not fetch the target page, but target validation still prevents abuse of H sessions and protects demo credits. Never log the objective if it may contain sensitive context.
- **VALIDATE**: Unit tests reject credentials, `localhost`, IPv4/IPv6 private ranges, metadata IPs, bad protocols, oversized objectives, and missing authorization; valid public HTTPS URLs pass.

### Task 3: Implement H product analysis and persona generation

- **ACTION**: Implement `POST /api/analyze` using H’s OpenAI-compatible Models API and structured output.
- **IMPLEMENT**:
  - Call H Models API server-side with URL and optional objective.
  - Prompt the model to infer product category, safe primary workflows, global boundaries, and exactly four personas.
  - Require behavioral diversity across digital confidence, time pressure, terminology familiarity, accessibility context, and trust boundaries.
  - Prohibit demeaning descriptions and demographic determinism.
  - Include the `ProductAnalysis` JSON schema in the documented H structured-output request.
  - Validate with Zod. Retry once with a schema-repair prompt; then return `UPSTREAM_INVALID_RESPONSE`.
  - Select four configured Gradium voice slots and four visual variants; do not let the model provide secret or arbitrary voice IDs.
  - Provide a deterministic local fixture analysis behind `NEXT_PUBLIC_ENABLE_DEMO_MODE=true`.
- **MIRROR**: `SERVICE_PATTERN`; schemas and locked persona decisions.
- **IMPORTS**: `openai`, `ProductAnalysisSchema`, `validateTargetUrl`, H client factory.
- **GOTCHA**: Do not use native OpenAI tools for the H model’s specialized structured path if official H docs require `structured_outputs`. Keep model output untrusted until parsed.
- **VALIDATE**: Mocked provider tests cover valid response, malformed JSON, wrong persona count, unsafe stop conditions, timeout, and retry exhaustion.

### Task 4: Launch, observe, retrieve, and cancel four H computer-use sessions

- **ACTION**: Implement the H Agents API boundary and session Route Handlers.
- **IMPLEMENT**:
  - `POST /api/sessions` accepts the validated target plus four `PersonaScenario`s.
  - Generate a `runId`/`group_id`; launch four independent sessions concurrently and tolerate H queueing.
  - For each session, override start URL, persona instructions, `max_steps`, `max_time_s`, and structured `AgentFinding` answer format.
  - Prompt includes task, success criteria, behavior constraints, synthetic-data policy, stop conditions, and explicit instruction to report visible evidence.
  - Return session ID, persona ID, initial status, and Agent View URL if present.
  - `GET /api/sessions/[id]/changes` validates `fromIndex`, long-polls 20–25 seconds, and returns only sanitized events needed by the normalizer plus status/metrics/answer.
  - Drain events until terminal plus no new events; do not stop simply because one page says `completed`.
  - `GET /api/sessions/[id]` returns final snapshot/latest answer.
  - `DELETE /api/sessions/[id]` cancels an active session and is used on user cancel/unmount.
  - Apply explicit upstream timeouts and map H `429`, timeout, invalid response, and missing session errors.
- **MIRROR**: `SERVICE_PATTERN`, stateless BFF architecture, H session docs.
- **IMPORTS**: `hai-agents`, shared schemas/errors/logger.
- **GOTCHA**: H’s API is beta; after the first smoke call, capture a sanitized real response in `tests/fixtures/h-session-events.ts` and adjust only the provider adapter. Never expose the H key or full upstream payload to the browser.
- **VALIDATE**: Provider contract tests prove four calls, stable persona/session association, queue handling, cancellation, timeout mapping, and final-answer parsing.

### Task 5: Normalize live events and implement the client run store

- **ACTION**: Convert H provider changes into a stable client state machine and consume all four sessions concurrently.
- **IMPLEMENT**:
  - `event-normalizer.ts` accepts unknown raw events and returns zero or more normalized updates.
  - Map known action names to `reading`, `navigating`, `typing`, and `backtracking`; unknown actions safely map to `reading`.
  - Never forward typed values, raw page HTML, hidden reasoning, cookies, or auth headers.
  - `use-session-polling.ts` maintains an independent cursor/AbortController per session, backs off on retryable failures, and drains terminal events.
  - Zustand store enforces phase transitions and persists a versioned snapshot to `sessionStorage` after meaningful updates.
  - Select the first active persona by default; user selection overrides automatic camera focus for ten seconds.
  - Technical provider failures remain visually distinct from product-task abandonment.
- **MIRROR**: `STATE_PATTERN` and Visual State Contract.
- **IMPORTS**: `zustand`, schemas, normalizer, browser fetch.
- **GOTCHA**: React Strict Mode can start effects twice; polling hooks need idempotent start/cleanup guards. Never increment the cursor until events are successfully applied.
- **VALIDATE**: Fixture tests cover ordered events, duplicate pages, unknown event type, cursor resumption, terminal draining, cancellation, and technical failure exclusion.

### Task 6: Implement deterministic scoring and hotspot aggregation

- **ACTION**: Build pure report-generation functions from completed normalized sessions.
- **IMPLEMENT**:
  - Implement the exact formulas under “Deterministic Scoring Contract.”
  - Exclude technical provider failures and mark reports incomplete until those personas are retried or explicitly excluded.
  - Cluster cross-persona findings using category + normalized evidence-token Jaccard similarity.
  - Rank recommendations by shared persona count, severity, and early occurrence.
  - Preserve each recommendation’s source persona/session/step for evidence links.
  - Include the synthetic-benchmark disclosure on every report and export.
- **MIRROR**: Pure-function `TEST_STRUCTURE`.
- **IMPORTS**: Run schemas only; no provider or React imports.
- **GOTCHA**: Do not use an LLM to set or “correct” the score. Avoid division by zero and do not award recovery penalties for technical failures.
- **VALIDATE**: Table-driven unit tests assert exact scores for all-success, all-abandoned, partial, over-budget, no-friction, recovered-friction, trust-friction, and provider-failure fixtures.

### Task 7: Build the accessible single-page product flow

- **ACTION**: Implement landing, analysis state, persona reveal, live-lab shell, and report transition.
- **IMPLEMENT**:
  - Landing: URL input, optional objective, authorization checkbox, microphone button placeholder, and “Release the Panel.”
  - Analyze immediately, show progress, then reveal four personas one-by-one in under five seconds.
  - Launch sessions after reveal and preserve partial starts if one session fails.
  - Live shell: global status, selected persona detail, per-persona progress, Cancel, Retry failed, and “View H replay.”
  - Report reveal: total score, five dimensions, 2/4 completion, top three shared hotspots, per-persona evidence, disclosure, and export JSON.
  - Use semantic controls and visible focus. Respect `prefers-reduced-motion`.
  - Never use color alone for statuses; pair color with labels/icons.
- **MIRROR**: UX diagrams and Interaction Changes.
- **IMPORTS**: Zustand store/hooks, Motion, local components.
- **GOTCHA**: Avoid blocking initial render on WebGL or audio permissions. Audio begins only after user interaction.
- **VALIDATE**: Component tests cover validation errors, disabled start, reveal order, status labels, cancel/retry, report disclosure, keyboard flow, and reduced-motion behavior.

### Task 8: Build the four-character 3D live testing lab

- **ACTION**: Implement a bounded, performant React Three Fiber scene driven only by normalized session state.
- **IMPLEMENT**:
  - Scene contains four tester stations in a shallow dollhouse arc, orthographic/perspective camera, restrained lighting, and a neutral floor.
  - Procedural character composition: head, hair, glasses, torso, arms/hands, seated lower body, mouth mesh; parameterize variants rather than duplicate code.
  - Implement animation states from `animation-policy.ts`: idle, lean/read, type, mouse, backtrack, confused, blocked, celebrate, close-laptop.
  - Clicking a tester selects the persona and moves the camera with a short bounded transition.
  - `<Html>` monitor surfaces display safe status/action/task and an external Agent View button; optional screenshot texture is behind a capability flag.
  - Desk beacon encodes state with color + icon/label.
  - Use selected persona audio amplitude to animate mouth scale; never attempt phoneme-level lip sync in the MVP.
  - Final report transition pulls camera upward, leaves four outcomes visible, and hands off to DOM report overlay.
  - Cap device pixel ratio, pause expensive animation when tab hidden, avoid allocations in `useFrame`, and render a 2D equivalent if WebGL init fails.
- **MIRROR**: Visual State Contract; React Three Fiber official Canvas/useFrame pattern.
- **IMPORTS**: `three`, `@react-three/fiber`, `@react-three/drei`, normalized types.
- **GOTCHA**: Keep all important text in DOM/`Html`, not baked into WebGL. Four characters share geometry/materials where possible. The scene must not own business state.
- **VALIDATE**: Story/fixture view manually cycles every state; component tests cover policy mapping and 2D fallback; Chrome performance remains smooth on the presentation laptop.

### Task 9: Add Gradium narration and safe lip animation

- **ACTION**: Implement selected-persona TTS through a server-only Gradium client.
- **IMPLEMENT**:
  - `POST /api/voice` accepts `{ personaId, voiceSlot, text, utteranceType }`, validates length/type, maps voice slot to server-configured voice ID, and calls Gradium REST TTS with WAV/`only_audio`.
  - Set `Cache-Control: private, max-age=300` only if response privacy is acceptable; otherwise use browser-memory dedupe only.
  - Narration priority: explicit user selection > structured friction/success/abandonment > persona intro > generic event quip.
  - Only selected persona speaks. Switching persona aborts queued low-priority audio.
  - Sanitize text to plain text, cap at 180 characters, never include typed values or raw page content.
  - Use `AudioContext`/`AnalyserNode` amplitude for mouth motion and fall back to CSS “speaking” indicator if unavailable.
  - Add mute and replay controls.
- **MIRROR**: Gradium REST contract and narration policy.
- **IMPORTS**: Gradium client, Zod schemas, Web Audio browser APIs.
- **GOTCHA**: Voice IDs are configuration, API key is secret. Browsers block autoplay; the initial “Release the Panel” click should establish permission but the UI must still handle rejection.
- **VALIDATE**: Mocked API tests cover invalid text, unknown slot, provider error, WAV content type, dedupe, selection switching, mute, and no-secret client bundles.

### Task 10: Add demo resilience, fixtures, and rehearsal controls

- **ACTION**: Ensure the pitch survives API latency, quota exhaustion, Wi-Fi issues, and partial provider failure.
- **IMPLEMENT**:
  - Capture one sanitized successful run fixture against a team-owned deliberately flawed demo site after the real integration works.
  - Fixture contains the same `ProductAnalysis`, normalized events, findings, metrics, replay placeholders, and report used by live mode.
  - Add visibly labeled “Replay demo run” entry available only when `NEXT_PUBLIC_ENABLE_DEMO_MODE=true`.
  - Add a developer-only timing control to replay at 1×/2×; production demo defaults to rehearsed pacing.
  - Launch the real live run at the beginning of the pitch, but keep the completed fixture one click away.
  - Cache generated persona intros in browser memory during a run.
  - Add quota/error copy that tells the presenter exactly whether to retry, cancel, or use replay.
- **MIRROR**: Same store and normalized-event path as live mode; no separate fake UI.
- **IMPORTS**: Fixture JSON/types, run-store actions.
- **GOTCHA**: Label replay honestly. Do not fabricate H Agent View URLs or claim fixture state is live.
- **VALIDATE**: Disconnect network during rehearsal; fixture still completes the full 90-second UI story without console errors.

### Task 11: Complete verification, security, documentation, and AWS deployment

- **ACTION**: Harden and deploy the frozen core build.
- **IMPLEMENT**:
  - Add unit/component/provider-contract/E2E tests listed below.
  - Configure CSP/security headers compatible with self-hosted assets, H links, and Three.js; avoid unsafe remote scripts.
  - Confirm no API keys in client chunks, logs, fixtures, screenshots, or Git history.
  - Run dependency audit and inspect production bundle size.
  - Deploy to AWS Amplify with Next 15 and server environment variables configured in Amplify, not committed.
  - Set H/Gradium budget and quota guardrails in provider dashboards where available; rotate/delete hackathon keys afterward.
  - README includes setup, architecture, data flow, scoring, safety limitations, sponsor usage, 90-second demo script, and troubleshooting.
  - Record a backup video after final deployment.
- **MIRROR**: Security-review checklist and AWS Amplify official build shape.
- **IMPORTS**: N/A beyond test tooling.
- **GOTCHA**: Amplify serverless instances do not share the in-memory limiter. Keep the URL private/unlisted or add AWS WAF/shared rate limiting before broad public launch.
- **VALIDATE**: Full validation commands pass locally and on Amplify; run the deployed live demo twice and fixture demo once.

### Task 12: Execute gated stretch integrations only after core freeze

- **ACTION**: Add high-value extras one at a time behind feature flags, reverting any that reduce demo reliability.
- **IMPLEMENT**:
  1. **Gradium STT**: press-to-record objective, server-side one-shot transcription, max 20 seconds/5 MB, explicit microphone consent.
  2. **Live screenshots**: if H events/resources expose stable screenshots, fetch through an authenticated server route and render as monitor texture; otherwise retain Agent View link.
  3. **NemoClaw**: after mentor confirmation, route a noncritical H-based report critic through a NemoClaw/OpenShell sandbox with explicit H endpoint egress policy. The deterministic score remains authoritative.
  4. **Before/after rerun**: allow a second URL/version to reuse the same personas/tasks and animate path/score differences.
- **MIRROR**: Provider adapter and feature-flag patterns established earlier.
- **IMPORTS**: Added only for the specific confirmed integration.
- **GOTCHA**: “Running the web app inside NemoClaw” does not necessarily satisfy “run H models through NemoClaw.” Get sponsor confirmation. Never expose voice keys or accept unbounded audio uploads.
- **VALIDATE**: Each flag can be disabled without affecting build/tests/core demo; mentor confirms sponsor eligibility before NemoClaw is presented as a challenge integration.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| Public URL accepted | `https://example.com/path` | normalized URL | No |
| Credential URL rejected | `https://u:p@example.com` | `INVALID_INPUT` | Yes |
| Private target rejected | localhost/private IPv4/IPv6/DNS result | `UNAUTHORIZED_TARGET` | Yes |
| Product schema enforces four personas | 3 or 5 personas | parse failure | Yes |
| H malformed response repaired once | invalid then valid payload | valid analysis | Yes |
| H malformed response fails safely | invalid twice | redacted retryable error | Yes |
| H queued lifecycle | queued → pending → running | normalized sequence | Yes |
| Unknown H event | unknown event object | `reading`, no crash | Yes |
| Typed value redaction | action contains form text | generic typing label | Yes |
| Cursor dedupe | same event page twice | applied once | Yes |
| Completed but task failed | status completed + finding abandoned | abandoned product outcome | Yes |
| Provider failed | H network failure | report incomplete, no usability penalty | Yes |
| All-success score | four clean successes | exact 100 | No |
| Partial completion score | mixed findings | exact frozen score | No |
| Recovery score | friction with recovered flags | exact recovery dimension | No |
| Trust penalty | severity 5 trust issue | capped penalty | Yes |
| Hotspot clustering | similar evidence from 3 personas | one ranked shared hotspot | No |
| Distinct hotspot separation | different category/evidence | separate clusters | Yes |
| Voice text cap | >180 chars | 400 | Yes |
| Voice slot mapping | slot 0..3 | server-configured ID | No |
| Raw provider error | secret-bearing upstream error | generic client response | Yes |
| Animation policy | every visual state | expected animation descriptor | No |
| Reduced motion | media preference true | 2D/minimal transitions | Yes |

### Component Tests

- Run form requires URL and authorization.
- Pressing Enter does not bypass disabled authorization.
- Persona reveal renders exactly four distinct behavior profiles.
- Live lab exposes equivalent accessible status text outside canvas.
- Selecting a persona updates focus and narration target.
- Cancel stops all active polling and calls cancel routes.
- Retry preserves successful sessions.
- Report always displays synthetic-benchmark disclosure.
- H Agent View links use `target="_blank"` and `rel="noopener noreferrer"`.
- Audio mute and autoplay failure leave the visual demo functional.

### Provider Contract Tests

- Record sanitized H session creation/changes/retrieve payload shapes after first real calls.
- Mock Gradium raw WAV response and error response.
- Assert timeouts and `429` responses map to stable `AppError` codes.
- Assert no route response contains provider keys, authorization headers, or raw reasoning fields.

### E2E Tests

1. Mock providers.
2. Enter authorized fixture URL and objective.
3. Reveal four personas.
4. Advance deterministic session events.
5. Select a persona and request mocked narration.
6. Complete run and assert exact report score/hotspots.
7. Verify fixture replay works with upstream routes disabled.

### Edge Cases Checklist

- [ ] Empty/invalid/oversized URL or objective
- [ ] URL with credentials, fragment, localhost, private DNS, IPv6 private target
- [ ] User does not confirm authorization
- [ ] H key missing or invalid
- [ ] Gradium key/voice unavailable
- [ ] H returns fewer/more than four persona sessions
- [ ] One session queues while others run
- [ ] One session fails technically
- [ ] Session status completes before final event page is drained
- [ ] H result is valid JSON but violates schema
- [ ] Duplicate/out-of-order event page
- [ ] Unknown event/action type
- [ ] User cancels during analysis, reveal, or run
- [ ] Network drops and resumes
- [ ] Browser blocks audio autoplay
- [ ] WebGL unavailable/context lost
- [ ] Reduced-motion preference
- [ ] Very small viewport/presentation projector scaling
- [ ] Multiple narration requests arrive together
- [ ] Persona attempts unsafe/irreversible action
- [ ] Target page contains prompt-injection text
- [ ] Fixture accidentally contains real personal data or secrets

---

## Security and Ethics Checklist

- [ ] All H and Gradium credentials are server-only environment variables.
- [ ] `.env*` excluded; `.env.example` contains names only.
- [ ] No secret appears in client bundles, fixture JSON, logs, or errors.
- [ ] URL policy rejects credentials and private/metadata networks.
- [ ] User explicitly confirms site ownership/authorization.
- [ ] Objective and persona prompt lengths are bounded.
- [ ] Agent prompt treats webpage content as untrusted and preserves higher-priority safety limits.
- [ ] Agents use synthetic data and stop before irreversible actions.
- [ ] No raw typed values, cookies, page HTML, or hidden reasoning reaches logs/narration.
- [ ] TTS input is plain text, length-limited, and selected from explicit fields.
- [ ] Audio recording, if added, requires consent and strict type/size/duration checks.
- [ ] Stock voices are used; cloning requires separate explicit consent and is out of core scope.
- [ ] API routes use same-origin requests, schema validation, timeouts, and rate limiting.
- [ ] Errors shown to users are stable/redacted; details remain server-side and redacted.
- [ ] CSP, frame, content-type, referrer, and permissions-policy headers are configured.
- [ ] External replay links use `noopener noreferrer`.
- [ ] Dependency audit passes or every exception is documented.
- [ ] H/Gradium keys are rotated or deleted after the event.
- [ ] Report states that results are synthetic and not accessibility/legal certification.

---

## Validation Commands

### Install and lock dependencies

```bash
pnpm install --frozen-lockfile
```

EXPECT: Reproducible install with no lock drift.

### Static Analysis

```bash
pnpm typecheck
pnpm lint
```

EXPECT: Zero TypeScript errors and zero lint errors.

### Unit and Component Tests

```bash
pnpm test --run
```

EXPECT: All schemas, provider adapters, scoring, security, state, and component tests pass.

### Browser Tests

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

EXPECT: Mock-provider demo flow and replay fallback pass in Chromium.

### Production Build

```bash
pnpm build
```

EXPECT: Next.js 15 production build succeeds; no server secrets appear in emitted client chunks.

### Dependency Security

```bash
pnpm audit --prod
```

EXPECT: No known high/critical production vulnerabilities; any lower exception documented.

### Full Gate

```bash
pnpm check
```

EXPECT: Typecheck, lint, unit tests, and build all succeed.

### Manual Validation

- [ ] Run one real H product analysis.
- [ ] Start four real H sessions and observe queue/running/completion behavior.
- [ ] Verify all four Agent View links open the correct sessions.
- [ ] Confirm session cancellation stops active sessions.
- [ ] Confirm each 3D character responds to its own normalized state.
- [ ] Select each persona and hear only that persona.
- [ ] Confirm mouth motion follows audio amplitude and stops afterward.
- [ ] Trigger a technical failure and verify it is not scored as product friction.
- [ ] Trigger WebGL failure/reduced motion and finish through 2D lab.
- [ ] Finish a live report and export its JSON.
- [ ] Finish the labeled fixture replay completely offline.
- [ ] Run deployed AWS build twice on venue Wi-Fi.
- [ ] Rehearse the 90-second demo five times with a timer.

---

## 48-Hour Execution Schedule and Team Split

| Time | Deliverable | Suggested owner |
|---|---|---|
| Hours 0–2 | Git/scaffold, keys, H/Gradium smoke calls, mentor quota questions | Lead + integrations |
| Hours 2–6 | Schemas, security boundary, H product analysis | Backend/integrations |
| Hours 4–10 | Four H sessions, event fixture, polling/normalization | Backend/integrations |
| Hours 4–12 | DOM shell, landing, persona reveal, report skeleton | Product frontend |
| Hours 6–16 | Procedural 3D lab and character state machine | 3D/frontend |
| Hours 10–18 | Scoring/hotspot tests and report wiring | Evaluation owner |
| Hours 14–22 | Gradium voice, selection, audio amplitude | Voice/frontend |
| Hours 18—26 | End-to-end integration and real run fixture | Whole team |
| Hours 26—32 | Visual polish, error states, 2D fallback, performance | Frontend + lead |
| Hours 32–36 | Feature freeze for core demo | Lead |
| Hours 36–40 | AWS deploy, security/audit, README | Ops/docs owner |
| Hours 40–44 | Only gated stretch work; otherwise fix/rehearse | Available owner |
| Hours 44–48 | Rehearsal, backup video, submission, key cleanup plan | Whole team |

### Hard gates

- No 3D polish before one H session completes end-to-end.
- No four-persona voice before selected-persona voice works.
- No STT, screenshot textures, NemoClaw, or before/after mode before core freeze.
- At hour 36, prioritize reliability and pitch assets over new features.

---

## 90-Second Demo Contract

1. **0–10s**: “Your engineers can use your product. Can your customers?” Paste the authorized demo URL and press **Release the Panel**.
2. **10–20s**: H generates/reveals four personas and goals.
3. **20–50s**: Four H sessions appear in the 3D lab. Select Linda; Gradium voices her intro/event observation. Show one H Agent View link briefly if timing permits.
4. **50–65s**: Two or more characters converge on an amber confusion state; one succeeds, one abandons.
5. **65–82s**: Camera pulls back; score and shared hotspot appear with evidence.
6. **82–90s**: Show the top recommended fix and, only if implemented reliably, a before/after rerun score.

The live run may continue behind the pitch. Keep a completed fixture run ready and clearly labeled.

---

## Acceptance Criteria

- [ ] A user can submit an authorized public URL and optional objective.
- [ ] H returns a schema-valid product analysis with exactly four behaviorally distinct personas/tasks.
- [ ] The system starts four H computer-use sessions with bounded steps/time and safe stop conditions.
- [ ] All sessions can queue, stream progress, complete, fail, retry, and cancel independently.
- [ ] Raw H events are isolated behind one tested normalizer.
- [ ] Four real 3D characters visibly represent the four normalized session states.
- [ ] Selecting a character exposes task/status/evidence and correct H Agent View link.
- [ ] Gradium voices the selected persona without exposing API credentials.
- [ ] Spoken text never includes hidden reasoning or typed sensitive values.
- [ ] The report score is deterministic and unit-tested.
- [ ] Shared hotspots cite persona/session/step evidence.
- [ ] Technical provider failures do not reduce the product’s usability score.
- [ ] Report includes synthetic-benchmark/accessibility disclaimer.
- [ ] WebGL, audio, and network failures have usable fallbacks.
- [ ] Labeled fixture replay exercises the same UI state path as live mode.
- [ ] All validation commands pass.
- [ ] Production deployment runs on AWS Amplify with server-only environment variables.
- [ ] README and submission materials credit H Company, Gradium, AWS, and any other assets/libraries.

## Completion Checklist

- [ ] Repository initialized after the hackathon start; no prior commits introduced.
- [ ] Code follows the greenfield conventions defined here.
- [ ] Zod schemas are the contract source of truth.
- [ ] Error handling and logs are redacted and consistent.
- [ ] Provider clients are isolated and mockable.
- [ ] Tests cover score formulas, raw event normalization, URL policy, and fallback flow.
- [ ] No hardcoded keys, tokens, real user data, or unlicensed assets.
- [ ] No unnecessary database/auth/multiplayer scope.
- [ ] Demo feature flags default to safe production behavior.
- [ ] Team has rehearsed both live and fixture flows.
- [ ] No questions remain for core implementation; mentor-dependent stretches are explicitly gated.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| H API beta payload differs from docs | Medium | High | One adapter, early smoke call, sanitized contract fixture, no raw event access in UI |
| H concurrency quota below four | Medium | High | Queue-aware UI, ask mentor hour 0, 2-live + 2-queued still visually valid |
| Agent run exceeds 90-second demo | High | High | Start early, use short controlled workflow, bounded steps, completed labeled fixture fallback |
| Target site changes or blocks agents | Medium | High | Use team-owned flawed demo site for judging; test public sites only with authorization |
| Real-time screenshots unavailable | Medium | Medium | Status/action DOM monitors + H Agent View links are core; textures optional |
| 3D scene consumes team time/performance | Medium | High | Procedural shared rig, bounded states, 2D fallback, hard gate after H smoke run |
| Gradium REST feels less live than WebSocket | Medium | Medium | Keep utterances short, pre-generate intros, play only selected persona; stream proxy is stretch |
| Browser blocks autoplay | High | Medium | Establish interaction on launch, visible unmute/replay, demo works silently |
| Score appears arbitrary | Medium | High | Publish exact weights/formulas and show evidence; never let LLM choose score |
| Personas appear ageist | Medium | High | Behavioral constraints, respectful voices/characters, diverse contexts, explicit product framing |
| Prompt injection on target page | Medium | High | Strong system/safety prompt, synthetic data, irreversible-action stop, authorized demo site |
| Public deployment burns credits | Medium | High | Unlisted URL, provider budget limits, demo limiter, optional AWS WAF/shared limiter |
| AWS Amplify incompatibility with newer Next | High if unpinned | High | Pin Next 15 and test deployment by hour 36 |
| NemoClaw integration does not qualify | Medium | Medium | Confirm with NVIDIA mentor before implementing or claiming it |
| Dirty/secret fixture data | Medium | High | Sanitize by schema, manually inspect fixture diff, never store raw headers/audio/page HTML |

---

## Sponsor and API Leverage

### H Company (critical path)

- Holo Models API: product understanding, task/persona generation, structured output.
- Computer-Use Agents: actual browser interaction for all four testers.
- Session lifecycle/changes: live lab animation source.
- Structured answer format: evidence and friction findings.
- Agent View: inspectable proof and replay.

### Gradium (critical enhancement)

- Stock persona voices for intros and explicit usability observations.
- Short server-side REST TTS for reliable MVP.
- Optional STT for spoken judge objective.
- Optional WebSocket multiplexing only if core is complete and deployment supports a secure proxy.

### AWS (deployment alignment)

- Amplify Hosting for the Next.js 15 SSR application and server-side provider routes.
- Environment variables stored in Amplify configuration.
- Optional AWS WAF/rate limiting only if the app is broadly published.

### NVIDIA (conditional stretch)

- NemoClaw/OpenShell can sandbox a noncritical H-powered report critic with explicit egress policy if mentor-confirmed.
- The deterministic score and core H sessions must not depend on this stretch path.

### APIs intentionally not added

- No avatar-generation API: procedural 3D removes latency, licensing, and rigging risk.
- No second LLM provider: H should visibly power reasoning and sponsor alignment.
- No analytics/database provider: unnecessary for the judged flow.
- No voice-cloning API: Gradium stock voices cover the creative requirement safely.

---

## Notes

- The exact H event discriminators and `hai-agents` TypeScript method names must be confirmed by the Task 4 smoke call because the API is beta. The adapter boundary and test fixture mean no later task needs to re-research the codebase.
- If H’s managed session structured-answer override proves unavailable for the chosen built-in agent, retrieve the session’s final prose and run one H Models API extraction into `AgentFindingSchema`. Keep that fallback inside `lib/h-company/client.ts` and mark it in logs.
- If procedural characters are visually insufficient, replace only `grandma-character.tsx` with one licensed GLB plus four material variants. The animation policy and scene contract remain unchanged.
- Keep “grandma” as a warm hook, but use “synthetic user panel” and “Human-Friendly Score” in technical explanations.
- The product claims pre-flight usability signal, not demographic validity, accessibility certification, or human-equivalent research.

