import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, validationFailure } from "@/lib/api/responses";
import { localizeHotspots } from "@/lib/hotspots/localize-hotspots";
import {
  NormalizedSessionSchema,
  ProductAnalysisSchema,
} from "@/lib/schemas/run";

const LocalizeHotspotsRequestSchema = z.object({
  sessions: z.array(NormalizedSessionSchema),
  analysis: ProductAnalysisSchema.nullable(),
  screenshotDataUrl: z.string().startsWith("data:image/").optional(),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = LocalizeHotspotsRequestSchema.parse(await req.json());
    const result = await localizeHotspots(
      request.sessions,
      request.analysis,
      request.screenshotDataUrl,
    );

    return ok(result.hotspots, {
      mode: result.mode,
      model: result.model,
      fallbackReason: result.fallbackReason,
    });
  } catch (error) {
    return validationFailure(error);
  }
}
