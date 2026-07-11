import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, validationFailure } from "@/lib/api/responses";
import { judgeVision } from "@/lib/integrations/nvidia";

const VisionJudgeRequestSchema = z.object({
  screenshotDataUrl: z.string().startsWith("data:image/").max(6_000_000).optional(),
  observation: z.string().min(1).max(1000),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = VisionJudgeRequestSchema.parse(await req.json());
    const result = await judgeVision(request);
    return ok(result, { mode: result.source });
  } catch (error) {
    return validationFailure(error);
  }
}
