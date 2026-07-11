import { NextRequest } from "next/server";
import { fail, ok, validationFailure } from "@/lib/api/responses";
import { getCalibration } from "@/lib/calibration/repository";
import { queueNemoClawRegressionJob } from "@/lib/integrations/nemoclaw";
import { z } from "zod";

const RequestSchema = z.object({
  candidateRunId: z.string().min(1).max(180),
});

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const calibration = await getCalibration(id);
    if (!calibration) return fail("not_found", "Calibration not found.", 404);
    if (calibration.status !== "approved") {
      return fail(
        "approval_required",
        "The calibration must be approved before regression orchestration.",
        409,
      );
    }
    const body = RequestSchema.parse(await request.json());
    const queued = await queueNemoClawRegressionJob({
      calibrationId: calibration.id,
      targetUrl: calibration.targetUrl,
      objective: calibration.objective,
      baselineRunId: `human-calibration:${calibration.id}`,
      candidateRunId: body.candidateRunId,
    });
    return ok(queued, { policy: "proposal-only" }, { status: 202 });
  } catch (error) {
    return validationFailure(error);
  }
}
