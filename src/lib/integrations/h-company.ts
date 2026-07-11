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
    agentViewUrl: readString(json, [
      "agent_view_url",
      "agentViewUrl",
      "session.agent_view_url",
      "session.share_url",
      "urls.agent_view",
    ]),
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
  const status = mapHStatus(readString(json, ["status", "session.status"]));
  const completed = status === "completed";
  const failed = status === "failed" || status === "timed_out";

  return {
    sessionId,
    personaId,
    status,
    visualState: completed ? "succeeded" : failed ? "failed" : "navigating",
    eventCursor: Number(readString(json, ["event_cursor", "eventCursor"]) ?? 0),
    stepCount: Number(readString(json, ["step_count", "stepCount"]) ?? 0),
    startedAt: readString(json, ["started_at", "startedAt"]) ?? null,
    finishedAt: readString(json, ["finished_at", "finishedAt"]) ?? null,
    agentViewUrl: readString(json, [
      "agent_view_url",
      "agentViewUrl",
      "share_url",
      "urls.agent_view",
    ]),
    outcome: completed ? "success" : failed ? "failure" : "unknown",
    latestActionLabel:
      readString(json, ["latest_action", "latestAction", "summary"]) ??
      "Session is still running",
    finding: null,
    errorCode: failed ? "provider_failure" : null,
  };
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

function buildPersonaPrompt(
  request: AnalyzeRequest,
  analysis: ProductAnalysis,
  persona: PersonaScenario,
) {
  return [
    `You are running a synthetic usability test for ${analysis.productName}.`,
    `Target URL: ${request.url}`,
    `Persona: ${persona.displayName} - ${persona.tagline}`,
    `Context: ${persona.context}`,
    `Task: ${persona.task}`,
    `Behaviors to simulate: ${persona.behaviors.join("; ")}`,
    `Safety boundaries: ${analysis.globalSafetyBoundaries.join("; ")}`,
    `Stop conditions: ${persona.stopConditions.join("; ")}`,
    "Do not submit real purchases, appointments, payments, messages, credentials, or private information.",
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
