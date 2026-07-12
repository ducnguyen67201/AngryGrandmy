import { createHash } from "node:crypto";
import { z } from "zod";
import type { AgentRuntimeEvent } from "@/lib/runtime/agent-events";
import type {
  AgentFinding,
  PersonaScenario,
  RunSnapshot,
} from "@/lib/schemas/run";

const ScreenshotReferenceSchema = z.object({
  kind: z.enum(["none", "external-url", "inline-redacted"]),
  ref: z.string().max(500).nullable(),
});

const TrainingTrajectoryEventSchema = z.object({
  eventId: z.string().min(1).max(240),
  cursor: z.number().int().min(0),
  step: z.number().int().min(0),
  createdAt: z.string().datetime(),
  currentUrl: z.string().url().nullable(),
  type: z.enum(["viewport", "narration", "research", "frustration"]),
  text: z.string().max(1000).nullable(),
  emotion: z.string().max(80).nullable(),
  query: z.string().max(500).nullable(),
  category: z
    .enum([
      "navigation",
      "clarity",
      "feedback",
      "recovery",
      "trust",
      "accessibility",
      "technical",
    ])
    .nullable(),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]).nullable(),
  observation: z.string().max(1200).nullable(),
  visibleEvidence: z.string().max(1200).nullable(),
  recommendation: z.string().max(1200).nullable(),
  x: z.number().min(0).max(100).nullable(),
  y: z.number().min(0).max(100).nullable(),
  coordinateSource: z.enum(["agent", "vision", "redacted", "missing"]).nullable(),
  screenshot: ScreenshotReferenceSchema,
});

export const TrainingEpisodeSchema = z.object({
  id: z.string().min(1).max(240),
  runId: z.string().min(1).max(180),
  sessionId: z.string().min(1).max(180),
  personaId: z.string().min(1).max(120),
  targetUrl: z.string().url(),
  objective: z.string().max(500).nullable(),
  product: z.object({
    name: z.string().max(200),
    category: z.string().max(200),
    summary: z.string().max(2000),
  }),
  persona: z.object({
    displayName: z.string().max(120),
    tagline: z.string().max(240),
    context: z.string().max(2000),
    task: z.string().max(2000),
    digitalConfidence: z.enum(["low", "medium", "high"]),
    behaviors: z.array(z.string().max(500)).max(20),
    trustBoundaries: z.array(z.string().max(500)).max(20),
    successCriteria: z.array(z.string().max(500)).max(20),
    stopConditions: z.array(z.string().max(500)).max(20),
  }),
  trajectory: z.array(TrainingTrajectoryEventSchema).max(600),
  labels: z.object({
    completion: z.enum(["success", "partial", "abandoned", "blocked"]),
    outcome: z.enum(["success", "failure", "unknown"]),
    safeStopReached: z.boolean(),
    stepCount: z.number().int().min(0),
    frictionCount: z.number().int().min(0),
    findingSummary: z.string().max(1000),
    frictionEvents: z.array(z.unknown()).max(100),
  }),
  report: z.object({
    score: z.number().min(0).max(100).nullable(),
    topRecommendations: z.array(z.string().max(1000)).max(10),
  }),
  trainingPoints: z.number().int().min(1),
  collectedAt: z.string().datetime(),
});

export const TrainingCollectionSummarySchema = z.object({
  episodeCount: z.number().int().min(0),
  trainingPointCount: z.number().int().min(0),
  frictionCount: z.number().int().min(0),
  personaCount: z.number().int().min(0),
});

export type TrainingTrajectoryEvent = z.infer<typeof TrainingTrajectoryEventSchema>;
export type TrainingEpisode = z.infer<typeof TrainingEpisodeSchema>;
export type TrainingCollectionSummary = z.infer<
  typeof TrainingCollectionSummarySchema
>;

export function buildTrainingEpisodes({
  snapshot,
  events,
}: {
  snapshot: RunSnapshot;
  events: readonly AgentRuntimeEvent[];
}): TrainingEpisode[] {
  if (snapshot.phase !== "report" || !snapshot.report || !snapshot.analysis) {
    return [];
  }
  const analysis = snapshot.analysis;
  const report = snapshot.report;

  const personaById = new Map(
    analysis.personas.map((persona) => [persona.id, persona]),
  );

  return snapshot.sessions.flatMap((session) => {
    const persona = personaById.get(session.personaId);
    const finding = session.finding;
    if (!persona || !finding) return [];

    const trajectory = events
      .filter(
        (event) =>
          event.sessionId === session.sessionId ||
          event.personaId === session.personaId,
      )
      .sort((left, right) => left.cursor - right.cursor)
      .map(toTrainingTrajectoryEvent);

    return [
      TrainingEpisodeSchema.parse({
        id: `${snapshot.id}:${session.sessionId}`,
        runId: snapshot.id,
        sessionId: session.sessionId,
        personaId: session.personaId,
        targetUrl: snapshot.url,
        objective: snapshot.objective ?? null,
        product: {
          name: analysis.productName,
          category: analysis.productCategory,
          summary: analysis.summary,
        },
        persona: toPersonaRecord(persona),
        trajectory,
        labels: toLabels(session.stepCount, session.outcome, finding),
        report: {
          score: report.score,
          topRecommendations: report.topRecommendations,
        },
        trainingPoints: countTrainingPoints(trajectory, finding),
        collectedAt: new Date().toISOString(),
      }),
    ];
  });
}

export function summarizeTrainingCollection(
  episodes: readonly TrainingEpisode[],
): TrainingCollectionSummary {
  return TrainingCollectionSummarySchema.parse({
    episodeCount: episodes.length,
    trainingPointCount: episodes.reduce(
      (total, episode) => total + episode.trainingPoints,
      0,
    ),
    frictionCount: episodes.reduce(
      (total, episode) => total + episode.labels.frictionCount,
      0,
    ),
    personaCount: new Set(episodes.map((episode) => episode.personaId)).size,
  });
}

function toPersonaRecord(persona: PersonaScenario): TrainingEpisode["persona"] {
  return {
    displayName: persona.displayName,
    tagline: persona.tagline,
    context: persona.context,
    task: persona.task,
    digitalConfidence: persona.digitalConfidence,
    behaviors: persona.behaviors,
    trustBoundaries: persona.trustBoundaries,
    successCriteria: persona.successCriteria,
    stopConditions: persona.stopConditions,
  };
}

function toLabels(
  stepCount: number,
  outcome: TrainingEpisode["labels"]["outcome"],
  finding: AgentFinding,
): TrainingEpisode["labels"] {
  return {
    completion: finding.completion,
    outcome,
    safeStopReached: finding.safeStopReached,
    stepCount,
    frictionCount: finding.frictionEvents.length,
    findingSummary: finding.summary,
    frictionEvents: finding.frictionEvents,
  };
}

function toTrainingTrajectoryEvent(
  event: AgentRuntimeEvent,
): TrainingTrajectoryEvent {
  return TrainingTrajectoryEventSchema.parse({
    eventId: event.id,
    cursor: event.cursor,
    step: event.step,
    createdAt: event.createdAt,
    currentUrl: event.currentUrl && isHttpUrl(event.currentUrl)
      ? event.currentUrl
      : null,
    type: event.type,
    text: event.text ?? null,
    emotion: event.emotion ?? null,
    query: event.query ?? null,
    category: event.category ?? null,
    severity: event.severity ?? null,
    observation: event.observation ?? null,
    visibleEvidence: event.visibleEvidence ?? null,
    recommendation: event.recommendation ?? null,
    x: validPercent(event.x) ? event.x : null,
    y: validPercent(event.y) ? event.y : null,
    coordinateSource: event.coordinateSource ?? null,
    screenshot: screenshotReference(event.imageUrl),
  });
}

function screenshotReference(imageUrl: string | undefined) {
  if (!imageUrl) return { kind: "none" as const, ref: null };
  if (imageUrl.startsWith("data:image/")) {
    return {
      kind: "inline-redacted" as const,
      ref: `sha256:${createHash("sha256").update(imageUrl).digest("hex")}`,
    };
  }
  if (isHttpUrl(imageUrl)) {
    return { kind: "external-url" as const, ref: imageUrl.slice(0, 500) };
  }
  return { kind: "none" as const, ref: null };
}

function countTrainingPoints(
  trajectory: readonly TrainingTrajectoryEvent[],
  finding: AgentFinding,
) {
  const behavioralSignals = trajectory.filter(
    (event) =>
      event.type === "narration" ||
      event.type === "frustration" ||
      event.type === "viewport",
  ).length;
  return Math.max(1, behavioralSignals + finding.frictionEvents.length + 1);
}

function validPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
