import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import { buildProductAnalysis } from "@/lib/product/analyze-product";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = validateAnalyzeRequest(await req.json());
    const analysis = buildProductAnalysis(request);
    const run = createDemoRun({
      id: `analysis-${Date.now()}`,
      url: request.url,
      objective: request.objective,
      analysis,
    });

    return ok(run, {
      mode: "demo-replay",
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
