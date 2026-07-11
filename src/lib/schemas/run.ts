import { z } from "zod";

export const VisualAgentStateSchema = z.enum([
  "queued",
  "launching",
  "reading",
  "navigating",
  "typing",
  "backtracking",
  "confused",
  "blocked",
  "succeeded",
  "abandoned",
  "failed",
]);

export const RunPhaseSchema = z.enum([
  "idle",
  "analyzing",
  "revealing",
  "running",
  "report",
  "error",
]);

export const AnalyzeRequestSchema = z.object({
  url: z.string().url().refine((value) => {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  }, "Only HTTP and HTTPS URLs are supported."),
  objective: z.string().trim().max(500).optional(),
  authorizationConfirmed: z.literal(true),
});

export const PersonaScenarioSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  tagline: z.string().min(1),
  context: z.string().min(1),
  digitalConfidence: z.enum(["low", "medium", "high"]),
  behaviors: z.array(z.string().min(1)).min(1),
  accessibilityContext: z.array(z.string().min(1)),
  trustBoundaries: z.array(z.string().min(1)).min(1),
  task: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  stopConditions: z.array(z.string().min(1)).min(1),
  expectedStepBudget: z.number().int().min(4).max(30),
  introLine: z.string().min(1).max(240),
  dispatchInstruction: z.string().min(1).max(4000).optional(),
  voiceSlot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  visualVariant: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
});

export const ProductAnalysisSchema = z.object({
  productName: z.string().min(1),
  productCategory: z.string().min(1),
  summary: z.string().min(1),
  primaryFlows: z
    .array(
      z.object({
        name: z.string().min(1),
        goal: z.string().min(1),
        safeStopPoint: z.string().min(1),
      }),
    )
    .min(1),
  globalSafetyBoundaries: z.array(z.string().min(1)).min(1),
  personas: z.tuple([
    PersonaScenarioSchema,
    PersonaScenarioSchema,
    PersonaScenarioSchema,
    PersonaScenarioSchema,
  ]),
});

export const FrictionEventSchema = z.object({
  step: z.number().int().min(0),
  category: z.enum([
    "navigation",
    "clarity",
    "feedback",
    "recovery",
    "trust",
    "accessibility",
    "technical",
  ]),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  observation: z.string().min(1),
  visibleEvidence: z.string().min(1),
  recommendation: z.string().min(1),
  narratedObservation: z.string().min(1).max(180),
  recovered: z.boolean(),
});

export const AgentFindingSchema = z.object({
  completion: z.enum(["success", "partial", "abandoned", "blocked"]),
  summary: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  frictionEvents: z.array(FrictionEventSchema),
  safeStopReached: z.boolean(),
});

export const NormalizedSessionSchema = z.object({
  sessionId: z.string().min(1),
  personaId: z.string().min(1),
  status: z.enum([
    "queued",
    "pending",
    "running",
    "paused",
    "completed",
    "timed_out",
    "interrupted",
    "failed",
  ]),
  visualState: VisualAgentStateSchema,
  eventCursor: z.number().int().min(0),
  stepCount: z.number().int().min(0),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  agentViewUrl: z.string().url().nullable(),
  outcome: z.enum(["success", "failure", "unknown"]),
  latestActionLabel: z.string().nullable(),
  finding: AgentFindingSchema.nullable(),
  errorCode: z.string().nullable(),
});

export const SharedHotspotSchema = z.object({
  id: z.string().min(1),
  category: FrictionEventSchema.shape.category,
  personaIds: z.array(z.string().min(1)).min(1),
  maxSeverity: FrictionEventSchema.shape.severity,
  visibleEvidence: z.string().min(1),
  recommendation: z.string().min(1),
});

export const UsabilityReportSchema = z.object({
  score: z.number().min(0).max(100),
  dimensions: z.object({
    completion: z.number().min(0).max(40),
    efficiency: z.number().min(0).max(20),
    clarity: z.number().min(0).max(15),
    recovery: z.number().min(0).max(15),
    trust: z.number().min(0).max(10),
  }),
  completedCount: z.number().int().min(0).max(4),
  sharedHotspots: z.array(SharedHotspotSchema),
  topRecommendations: z.array(z.string().min(1)),
  disclosure: z.literal(
    "Synthetic usability benchmark; not a replacement for human research or accessibility certification.",
  ),
});

export const RunSnapshotSchema = z.object({
  id: z.string().min(1),
  phase: RunPhaseSchema,
  url: z.string().url(),
  objective: z.string().optional(),
  analysis: ProductAnalysisSchema.nullable(),
  sessions: z.array(NormalizedSessionSchema),
  selectedPersonaId: z.string().nullable(),
  report: UsabilityReportSchema.nullable(),
  error: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type VisualAgentState = z.infer<typeof VisualAgentStateSchema>;
export type RunPhase = z.infer<typeof RunPhaseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type PersonaScenario = z.infer<typeof PersonaScenarioSchema>;
export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;
export type FrictionEvent = z.infer<typeof FrictionEventSchema>;
export type AgentFinding = z.infer<typeof AgentFindingSchema>;
export type NormalizedSession = z.infer<typeof NormalizedSessionSchema>;
export type SharedHotspot = z.infer<typeof SharedHotspotSchema>;
export type UsabilityReport = z.infer<typeof UsabilityReportSchema>;
export type RunSnapshot = z.infer<typeof RunSnapshotSchema>;

export const visualAgentStateSchema = VisualAgentStateSchema;
export const runPhaseSchema = RunPhaseSchema;
export const analyzeRequestSchema = AnalyzeRequestSchema;
export const personaScenarioSchema = PersonaScenarioSchema;
export const productAnalysisSchema = ProductAnalysisSchema;
export const frictionEventSchema = FrictionEventSchema;
export const agentFindingSchema = AgentFindingSchema;
export const normalizedSessionSchema = NormalizedSessionSchema;
export const sharedHotspotSchema = SharedHotspotSchema;
export const usabilityReportSchema = UsabilityReportSchema;
export const runSnapshotSchema = RunSnapshotSchema;
