import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, validationFailure } from "@/lib/api/responses";
import { calculateUsabilityReport } from "@/lib/scoring/calculate-report";
import { NormalizedSessionSchema } from "@/lib/schemas/run";

const ReportRequestSchema = z.object({
  sessions: z.array(NormalizedSessionSchema).min(1),
  expectedStepBudgetByPersona: z.record(
    z.string(),
    z.number().int().min(4).max(30),
  ),
});

export async function POST(req: NextRequest) {
  try {
    const request = ReportRequestSchema.parse(await req.json());
    return ok(
      calculateUsabilityReport(
        request.sessions,
        request.expectedStepBudgetByPersona,
      ),
      { mode: "deterministic" },
    );
  } catch (error) {
    return validationFailure(error);
  }
}
