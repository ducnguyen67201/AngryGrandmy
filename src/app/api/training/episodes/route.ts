import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, validationFailure } from "@/lib/api/responses";
import {
  buildTrainingEpisodes,
  summarizeTrainingCollection,
} from "@/lib/training/training-episode";
import {
  listTrainingEpisodes,
  saveTrainingEpisodes,
} from "@/lib/training/repository";
import { RunSnapshotSchema } from "@/lib/schemas/run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RuntimeEventSchema = z.object({
  id: z.string().min(1).max(240),
  sessionId: z.string().min(1).max(180),
  personaId: z.string().min(1).max(120),
  cursor: z.number().int().min(0),
  step: z.number().int().min(0),
  createdAt: z.string().datetime(),
  type: z.enum(["viewport", "narration", "research", "frustration"]),
  imageUrl: z.string().max(12_000_000).optional(),
  text: z.string().max(1000).optional(),
  emotion: z.string().max(80).optional(),
  query: z.string().max(500).optional(),
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
    .optional(),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]).optional(),
  observation: z.string().max(1200).optional(),
  visibleEvidence: z.string().max(1200).optional(),
  currentUrl: z.string().url().optional(),
  recommendation: z.string().max(1200).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  coordinateSource: z.enum(["agent", "vision"]).optional(),
});

const CollectTrainingEpisodesSchema = z.object({
  snapshot: RunSnapshotSchema.refine(
    (snapshot) => snapshot.phase === "report" && Boolean(snapshot.report),
    "Only completed report runs can be collected as training data.",
  ),
  events: z.array(RuntimeEventSchema).max(600),
});

export async function GET() {
  try {
    const episodes = await listTrainingEpisodes();
    return ok({
      episodes,
      summary: summarizeTrainingCollection(episodes),
    });
  } catch {
    return fail(
      "training_dataset_unavailable",
      "Could not read the local training dataset.",
      503,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const request = CollectTrainingEpisodesSchema.parse(await req.json());
    const episodes = buildTrainingEpisodes(request);
    const result = await saveTrainingEpisodes(episodes);
    return ok(
      {
        episodes,
        savedCount: result.savedCount,
        totalCount: result.totalCount,
        summary: result.summary,
      },
      { storage: "local-json" },
      { status: 201 },
    );
  } catch (error) {
    return validationFailure(error);
  }
}
