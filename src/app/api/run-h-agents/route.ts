import { NextRequest } from "next/server";
import { ok, validationFailure } from "@/lib/api/responses";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  createHCompanySession,
  isHCompanyConfigured,
} from "@/lib/integrations/h-company";
import { buildProductAnalysisPlan } from "@/lib/product/analyze-product";
import {
  getTesterCountFromRequest,
  limitPersonasForTesterCount,
} from "@/lib/run/tester-count";
import type { NormalizedSession } from "@/lib/schemas/run";
import { ProductAnalysisSchema } from "@/lib/schemas/run";
import { validateAnalyzeRequest } from "@/lib/security/url-policy";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const request = validateAnalyzeRequest(raw);
    const testerCount = getTesterCountFromRequest(raw);
    const plan = await buildProductAnalysisPlan(request);
    const analysis = request.customPersona
      ? ProductAnalysisSchema.parse({
          ...plan.analysis,
          personas: [...plan.analysis.personas, request.customPersona],
        })
      : plan.analysis;
    const generatedPersonasToLaunch = limitPersonasForTesterCount(analysis, testerCount);
    const personasToLaunch =
      request.customPersona &&
      !generatedPersonasToLaunch.some((persona) => persona.id === request.customPersona?.id)
        ? [...generatedPersonasToLaunch, request.customPersona]
        : generatedPersonasToLaunch;

    if (!isHCompanyConfigured()) {
      const replay = createDemoRun({ url: request.url, objective: request.objective, analysis });
      return ok(
        {
          ...replay,
          sessions: replay.sessions.filter((session) =>
            personasToLaunch.some((persona) => persona.id === session.personaId),
          ),
        },
        {
          mode: "demo-replay",
          configured: false,
          requestedCount: personasToLaunch.length,
          reason: "HAI_API_KEY is not configured.",
        },
      );
    }

    const launched = await Promise.allSettled(
      personasToLaunch.map((persona) =>
        createHCompanySession(request, analysis, persona),
      ),
    );
    const launchedCount = launched.filter(
      (item) => item.status === "fulfilled",
    ).length;

    if (launchedCount === 0) {
      const replay = createDemoRun({ url: request.url, objective: request.objective, analysis });
      return ok(
        {
          ...replay,
          sessions: replay.sessions.filter((session) =>
            personasToLaunch.some((persona) => persona.id === session.personaId),
          ),
        },
        {
          mode: "demo-replay",
          configured: true,
          requestedCount: personasToLaunch.length,
          reason: "All H Company launches failed, so GrannySmith used replay mode.",
        },
      );
    }

    const sessions: NormalizedSession[] = launched.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const persona = personasToLaunch[index];
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
        personaMode: plan.mode,
        personaModel: plan.model,
        personaFallbackReason: plan.fallbackReason,
        configured: true,
        requestedCount: personasToLaunch.length,
        launchedCount,
      },
    );
  } catch (error) {
    return validationFailure(error);
  }
}
