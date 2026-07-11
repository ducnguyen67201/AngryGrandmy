import { NextRequest } from "next/server";
import { fail, ok, validationFailure } from "@/lib/api/responses";
import { CalibrationApprovalSchema } from "@/lib/calibration/calibration";
import {
  getCalibration,
  updateCalibration,
} from "@/lib/calibration/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const session = await getCalibration(id);
    if (!session) return fail("not_found", "Calibration not found.", 404);
    return ok(session, undefined, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return validationFailure(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const approval = CalibrationApprovalSchema.parse(await request.json());
    const now = new Date().toISOString();
    const session = await updateCalibration(id, (current) => ({
      ...current,
      behaviorRules: approval.behaviorRules,
      trustBoundaries: approval.trustBoundaries,
      status: approval.approved ? "approved" : "rejected",
      approvedAt: approval.approved ? now : null,
      updatedAt: now,
    }));
    return ok(session, undefined, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Calibration not found.") {
      return fail("not_found", error.message, 404);
    }
    return validationFailure(error);
  }
}
