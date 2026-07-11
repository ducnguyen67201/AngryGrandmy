import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  createHCompanySession,
  isHCompanyConfigured,
} from "@/lib/integrations/h-company";
import { buildProductAnalysis } from "@/lib/product/analyze-product";
import type { NormalizedSession } from "@/lib/schemas/run";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const request = validateAnalyzeRequest(await req.json());
    const analysis = buildProductAnalysis(request);

    if (!isHCompanyConfigured()) {
      return ok(createDemoRun({ url: request.url, objective: request.objective, analysis }), {
        mode: "demo-replay",
        configured: false,
        reason: "HAI_API_KEY is not configured.",
      });
    }

    const launched = await Promise.allSettled(
      analysis.personas.map((persona) =>
        createHCompanySession(request, analysis, persona),
      ),
    );

    const sessions: NormalizedSession[] = launched.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const persona = analysis.personas[index];
      return {
        sessionId: `h-failed-${persona.id}`,
        personaId: persona.id,
        status: "failed",
        visualState: "failed",
        eventCursor: 0,
        stepCount: 0,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        agentViewUrl: null,
        outcome: "failure",
        latestActionLabel: "H Company launch failed; replay remains available.",
        finding: null,
        errorCode: "provider_failure",
      };
    });

    const run = createDemoRun({
      id: `h-run-${Date.now()}`,
      url: request.url,
      objective: request.objective,
      analysis,
    });

    return ok(
      {
        ...run,
        phase: "running",
        sessions,
        report: null,
      },
      {
        mode: "h-company",
        configured: true,
        launchedCount: launched.filter((item) => item.status === "fulfilled")
          .length,
      },
    );
  } catch (error) {
    return validationFailure(error);
  }
}
