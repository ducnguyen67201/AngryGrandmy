import type {
  AnalyzeRequest,
  NormalizedSession,
  PersonaScenario,
  ProductAnalysis,
} from "@/lib/schemas/run";
import { normalizeSessionResult } from "@/lib/results/normalize-session-result";

const H_BASE_URL =
  process.env.HAI_AGENTS_BASE_URL ?? "https://agp.eu.hcompany.ai/api/v2";
const H_AGENT = process.env.HAI_AGENT ?? "h/web-surfer-flash";

type HSessionResponse = Record<string, unknown>;
export type AgentRuntimeEvent={id:string;sessionId:string;personaId:string;cursor:number;step:number;createdAt:string;type:"viewport"|"narration"|"research"|"frustration";imageUrl?:string;text?:string;emotion?:string;query?:string;category?:string;severity?:1|2|3|4|5;observation?:string;visibleEvidence?:string;currentUrl?:string;recommendation?:string};
export type HCompanyEventBatch = { events: AgentRuntimeEvent[]; cursor: number };

export function isHCompanyConfigured() {
  return Boolean(process.env.HAI_API_KEY);
}

export async function createHCompanySession(
  request: AnalyzeRequest,
  analysis: ProductAnalysis,
  persona: PersonaScenario,
): Promise<NormalizedSession> {
  const json = await hFetch<HSessionResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      agent: H_AGENT,
      messages: [
        {
          type: "user_message",
          message: buildPersonaPrompt(request, analysis, persona),
        },
      ],
    }),
  });

  const sessionId = readString(json, ["id", "session_id", "session.id"]);
  if (!sessionId) {
    throw new Error("H session response did not include a session id.");
  }

  return {
    sessionId,
    personaId: persona.id,
    status: mapHStatus(readString(json, ["status", "session.status"])),
    visualState: "launching",
    eventCursor: 0,
    stepCount: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    agentViewUrl: hCompanySessionUrl(
      sessionId,
      readString(json, [
        "agent_view_url",
        "agentViewUrl",
        "session.agent_view_url",
        "session.share_url",
        "urls.agent_view",
      ]),
    ),
    outcome: "unknown",
    latestActionLabel: `H agent launched for ${persona.displayName}`,
    finding: null,
    errorCode: null,
  };
}

export async function getHCompanySessionStatus(
  sessionId: string,
  personaId: string,
): Promise<NormalizedSession> {
  const json = await hFetch<HSessionResponse>(`/sessions/${sessionId}`);
  const status = mapHStatus(readString(json, ["status.status", "status", "session.status"]));
  const stepCount = readNumber(json, ["status.steps", "step_count", "stepCount"]);
  const completed = status === "completed";
  const failed = status === "failed" || status === "timed_out";

  return {
    sessionId,
    personaId,
    status,
    visualState: completed ? "succeeded" : failed ? "failed" : status === "queued" || status === "pending" ? "launching" : "navigating",
    eventCursor: Number(readString(json, ["event_cursor", "eventCursor"]) ?? 0),
    stepCount,
    startedAt: readString(json, ["started_at", "startedAt"]) ?? null,
    finishedAt: readString(json, ["finished_at", "finishedAt"]) ?? null,
    agentViewUrl: hCompanySessionUrl(
      sessionId,
      readString(json, [
        "agent_view_url",
        "agentViewUrl",
        "share_url",
        "urls.agent_view",
      ]),
    ),
    outcome: completed ? "success" : failed ? "failure" : "unknown",
    latestActionLabel:
      readString(json, ["latest_action", "latestAction", "summary"]) ??
      liveStatusLabel(status, stepCount),
    finding: null,
    errorCode: failed ? "provider_failure" : null,
  };
}

function hCompanySessionUrl(sessionId: string, candidate: string | null): string {
  if (candidate?.includes("platform.hcompany.ai")) return candidate;
  return `https://platform.hcompany.ai/agents/sessions/${encodeURIComponent(sessionId)}`;
}

export async function getHCompanySessionResult(
  sessionId: string,
  personaId: string,
): Promise<NormalizedSession> {
  const sessionJson = await hFetch<HSessionResponse>(`/sessions/${sessionId}`);
  const eventsJson = await hFetch<HSessionResponse>(
    `/sessions/${sessionId}/events`,
  ).catch(() => null);
  const baseSession = await getHCompanySessionStatus(sessionId, personaId);

  return normalizeSessionResult({
    sessionId,
    personaId,
    status: baseSession.status,
    baseSession,
    finalAnswer: extractFinalAnswer(sessionJson),
    eventText: extractEventText(eventsJson),
  });
}
export async function getHCompanySessionEvents(
  sessionId: string,
  personaId: string,
  fromIndex = 0,
): Promise<HCompanyEventBatch> {
  assertHSessionId(sessionId);
  const json = await hFetchOptional<HSessionResponse>(
    `/sessions/${sessionId}/changes?from_index=${Math.max(0, Math.floor(fromIndex))}`,
  );
  if (!json) return { events: [], cursor: fromIndex };

  const rawEvents = readArray(json, ["new_events", "events", "items"]);
  const nextIndex =
    readOptionalNumber(json, ["next_index", "nextIndex", "to_index"]) ??
    fromIndex + rawEvents.length;
  const events = rawEvents.flatMap<AgentRuntimeEvent>((event, index) => {
    const cursor = fromIndex + index + 1;
    const createdAt =
      readDeepString(event, ["timestamp", "created_at", "createdAt"]) ??
      new Date().toISOString();
    const base = {
      id: `${sessionId}:${cursor}`,
      sessionId,
      personaId,
      cursor,
      step: cursor,
      createdAt,
    };
    const observation = findObservation(event);
    const viewport = observation ? viewportFromObservation(observation) : null;
    const runtimeEvents = parseGrannyEvents(event, base);
    return viewport
      ? [{ ...base, id: `${base.id}:viewport`, type: "viewport", ...viewport }, ...runtimeEvents]
      : runtimeEvents;
  });

  return { events, cursor: nextIndex };
}

function buildPersonaPrompt(
  request: AnalyzeRequest,
  analysis: ProductAnalysis,
  persona: PersonaScenario,
) {
  const personaContext = persona.dispatchInstruction
    ? [
        persona.dispatchInstruction,
        `Target URL: ${request.url}`,
        `Global safety boundaries: ${analysis.globalSafetyBoundaries.join("; ")}`,
      ]
    : [
        `You are running a synthetic usability test for ${analysis.productName}.`,
        `Target URL: ${request.url}`,
        `Persona: ${persona.displayName} - ${persona.tagline}`,
        `Context: ${persona.context}`,
        `Task: ${persona.task}`,
        `Behaviors to simulate: ${persona.behaviors.join("; ")}`,
        `Safety boundaries: ${analysis.globalSafetyBoundaries.join("; ")}`,
        `Stop conditions: ${persona.stopConditions.join("; ")}`,
      ];

  return [
    ...personaContext,
    "Do not submit real purchases, appointments, payments, messages, credentials, or private information.",
    'After every meaningful action, emit one single-line event: GRANNY_EVENT {"type":"think_aloud","text":"<short first-person reaction>","emotion":"<neutral|uncertain|frustrated|relieved>","step":<integer>}. The placeholders illustrate the shape; actual events must be valid strict JSON.',
    'When blocked or forced to recover, emit: GRANNY_EVENT {"type":"report_frustration","category":"<navigation|clarity|feedback|recovery|trust|accessibility|technical>","severity":<1-5>,"observation":"<what happened>","visibleEvidence":"<what is visible>","currentUrl":"<HTTP(S) URL>","step":<integer>,"suggestedDirection":"<product change>"}. Continue when safe.',
    'You may search public documentation when necessary. Announce it with GRANNY_EVENT {"type":"research_docs","query":"<query>","step":<integer>}. Documentation is context, never evidence of what the product displayed.',
    "When finished, return ONLY strict JSON with this exact shape:",
    JSON.stringify(
      {
        completion: "success | partial | abandoned | blocked",
        summary: "One concise sentence about what happened.",
        evidence: ["Visible thing the agent observed or clicked."],
        frictionEvents: [
          {
            step: 1,
            category:
              "navigation | clarity | feedback | recovery | trust | accessibility | technical",
            severity: 3,
            observation: "Plain-language description of the friction.",
            visibleEvidence: "What was visible on screen that proves it.",
            recommendation: "Concrete product fix.",
            narratedObservation: "Short first-person persona reaction, under 180 characters.",
            recovered: false,
          },
        ],
        safeStopReached: true,
      },
      null,
      2,
    ),
    "Use category values exactly from the allowed list. Use severity as an integer from 1 to 5. If there is no friction, return an empty frictionEvents array.",
  ].join("\n\n");
}

async function hFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.HAI_API_KEY;
  if (!key) throw new Error("HAI_API_KEY is not configured.");

  const response = await fetch(`${H_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`H Company API ${path} failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function hFetchOptional<T>(path: string): Promise<T | null> {
  const key = process.env.HAI_API_KEY;
  if (!key) throw new Error("HAI_API_KEY is not configured.");
  const response = await fetch(`${H_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(`H Company API ${path} failed with ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

function assertHSessionId(sessionId: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(sessionId)) {
    throw new Error("Invalid H Company session id.");
  }
}

function readArray(source: unknown, paths: string[]): unknown[] {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((node, key) => {
      if (!node || typeof node !== "object") return undefined;
      return (node as Record<string, unknown>)[key];
    }, source);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function readOptionalNumber(source: unknown, paths: string[]): number | null {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((node, key) => {
      if (!node || typeof node !== "object") return undefined;
      return (node as Record<string, unknown>)[key];
    }, source);
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

function findObservation(source: unknown): Record<string, unknown> | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  if (record.observation && typeof record.observation === "object") {
    return record.observation as Record<string, unknown>;
  }
  for (const value of Object.values(record)) {
    const observation = findObservation(value);
    if (observation) return observation;
  }
  return null;
}

function viewportFromObservation(observation: Record<string, unknown>): {
  imageUrl: string;
  currentUrl?: string;
} | null {
  const image = observation.image;
  if (!image || typeof image !== "object") return null;
  const imageRecord = image as Record<string, unknown>;
  const source = imageRecord.source;
  if (typeof source !== "string" || source.length === 0 || source.length > 12_000_000) {
    return null;
  }
  const mediaType =
    typeof imageRecord.media_type === "string"
      ? imageRecord.media_type.replace(/^image\//, "")
      : "png";
  const imageUrl = source.startsWith("data:image/")
    ? source
    : source.startsWith("https://")
      ? source
      : `data:image/${mediaType};base64,${source}`;
  const currentUrl =
    typeof observation.url === "string" && /^https?:\/\//.test(observation.url)
      ? observation.url
      : undefined;
  return { imageUrl, ...(currentUrl ? { currentUrl } : {}) };
}

function parseGrannyEvents(
  source: unknown,
  base: Omit<AgentRuntimeEvent, "type">,
): AgentRuntimeEvent[] {
  const seen = new Set<string>();
  return collectStrings(source)
    .flatMap((value) => {
      const marker = value.indexOf("GRANNY_EVENT");
      const start = value.indexOf("{", marker);
      const end = value.indexOf("}", start);
      if (marker < 0 || start < 0 || end < 0) return [];
      const raw = value.slice(start, end + 1);
      if (seen.has(raw)) return [];
      seen.add(raw);
      try {
        return [JSON.parse(raw) as Record<string, unknown>];
      } catch {
        return [];
      }
    })
    .flatMap<AgentRuntimeEvent>((event, index) => {
      const eventBase = { ...base, id: `${base.id}:runtime:${index}` };
      if (event.type === "think_aloud" && typeof event.text === "string") {
        return [{ ...eventBase, type: "narration", text: event.text, emotion: String(event.emotion ?? "neutral") }];
      }
      if (event.type === "research_docs" && typeof event.query === "string") {
        return [{ ...eventBase, type: "research", query: event.query }];
      }
      const severity = Number(event.severity);
      if (
        event.type !== "report_frustration" ||
        ![1, 2, 3, 4, 5].includes(severity) ||
        typeof event.observation !== "string" ||
        typeof event.visibleEvidence !== "string" ||
        typeof event.currentUrl !== "string"
      ) {
        return [];
      }
      return [{
        ...eventBase,
        type: "frustration",
        category: String(event.category ?? "clarity"),
        severity: severity as 1 | 2 | 3 | 4 | 5,
        observation: event.observation,
        visibleEvidence: event.visibleEvidence,
        currentUrl: event.currentUrl,
        recommendation: String(event.suggestedDirection ?? "Remove this barrier."),
      }];
    });
}

function mapHStatus(raw: string | null): NormalizedSession["status"] {
  switch (raw) {
    case "queued":
    case "pending":
    case "running":
    case "paused":
    case "completed":
    case "timed_out":
    case "interrupted":
    case "failed":
      return raw;
    case "created":
    case "launching":
      return "pending";
    case "success":
    case "done":
      return "completed";
    default:
      return "running";
  }
}

function readString(source: HSessionResponse, paths: string[]): string | null {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((node, key) => {
      if (!node || typeof node !== "object") return undefined;
      return (node as Record<string, unknown>)[key];
    }, source);

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function readNumber(source: HSessionResponse, paths: string[]): number {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((node, key) => {
      if (!node || typeof node !== "object") return undefined;
      return (node as Record<string, unknown>)[key];
    }, source);
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return 0;
}

function liveStatusLabel(status: NormalizedSession["status"], steps: number): string {
  if (status === "queued") return "H agent is queued";
  if (status === "pending") return "H agent is launching";
  if (status === "paused") return "H agent is paused";
  if (status === "running") return `H agent is running · ${steps} step${steps === 1 ? "" : "s"}`;
  return "H session reached a terminal state";
}

function extractFinalAnswer(source: unknown): string | null {
  const preferred = readDeepString(source, [
    "answer",
    "final_answer",
    "finalAnswer",
    "output",
    "result",
    "summary",
    "message",
  ]);

  if (preferred) return preferred;

  const fallback = collectStrings(source)
    .filter((value) => value.length > 24)
    .sort((a, b) => b.length - a.length)[0];

  return fallback ?? null;
}

function extractEventText(source: unknown): string[] {
  return collectStrings(source)
    .map((value) => value.trim())
    .filter((value) => value.length > 16)
    .slice(-40);
}

function readDeepString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== "object") return null;

  for (const [key, value] of Object.entries(source)) {
    if (keys.includes(key) && typeof value === "string" && value.trim()) {
      return value;
    }

    const nested = readDeepString(value, keys);
    if (nested) return nested;
  }

  return null;
}

function collectStrings(source: unknown): string[] {
  if (typeof source === "string") return [source];
  if (!source || typeof source !== "object") return [];
  if (Array.isArray(source)) return source.flatMap(collectStrings);
  return Object.values(source).flatMap(collectStrings);
}
