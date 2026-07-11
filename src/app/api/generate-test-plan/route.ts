import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import { buildProductAnalysisPlan } from "@/lib/product/analyze-product";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = validateAnalyzeRequest(await req.json());
    const plan = await buildProductAnalysisPlan(request);
    const analysis = plan.analysis;

    return ok(
      {
        analysis,
        personas: analysis.personas,
        primaryFlows: analysis.primaryFlows,
      },
      {
        mode: plan.mode,
        model: plan.model,
        fallbackReason: plan.fallbackReason,
      },
    );
  } catch (error) {
    return validationFailure(error);
  }
}
