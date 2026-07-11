import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { buildProductAnalysisPlan } from "@/lib/product/analyze-product";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = validateAnalyzeRequest(await req.json());
    const plan = await buildProductAnalysisPlan(request);
    const run = createDemoRun({
      id: `analysis-${Date.now()}`,
      url: request.url,
      objective: request.objective,
      analysis: plan.analysis,
    });

    return ok(run, {
      mode: plan.mode,
      model: plan.model,
      fallbackReason: plan.fallbackReason,
      configured: {
        hCompany: Boolean(process.env.HAI_API_KEY),
        gradium: Boolean(process.env.GRADIUM_API_KEY),
        nvidia: Boolean(process.env.NVIDIA_API_KEY),
      },
    });
  } catch (error) {
    return validationFailure(error);
  }
}
