import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import { buildProductAnalysis } from "@/lib/product/analyze-product";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = validateAnalyzeRequest(await req.json());
    const analysis = buildProductAnalysis(request);

    return ok(
      {
        analysis,
        personas: analysis.personas,
        primaryFlows: analysis.primaryFlows,
      },
      { mode: "heuristic" },
    );
  } catch (error) {
    return validationFailure(error);
  }
}
