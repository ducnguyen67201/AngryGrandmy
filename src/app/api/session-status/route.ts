import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/responses";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  getHCompanySessionEvents,
  getHCompanySessionStatus,
  isHCompanyConfigured,
} from "@/lib/integrations/h-company";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const personaId = req.nextUrl.searchParams.get("personaId") ?? "linda";
  const eventsMode = req.nextUrl.searchParams.get("events") === "1";
  const after = Number(req.nextUrl.searchParams.get("after") ?? 0);

  if (!sessionId) {
    return fail("missing_session_id", "sessionId is required.", 400);
  }

  if (!isHCompanyConfigured() || sessionId.startsWith("demo-")) {
    const session = createDemoRun().sessions.find(
      (item) => item.sessionId === sessionId || item.personaId === personaId,
    );
    if(eventsMode){const f=session?.finding?.frictionEvents[0],createdAt=session?.finishedAt??new Date().toISOString(),events=f?[{id:`${sessionId}:1`,sessionId,personaId,cursor:1,step:f.step,createdAt,type:"narration",text:f.narratedObservation,emotion:"frustrated"},{id:`${sessionId}:2`,sessionId,personaId,cursor:2,step:f.step,createdAt,type:"frustration",category:f.category,severity:f.severity,observation:f.observation,visibleEvidence:f.visibleEvidence,currentUrl:"https://demo-health.example",recommendation:f.recommendation}]:[];return ok(events.filter(e=>e.cursor>after),{mode:"demo-replay",cursor:events.at(-1)?.cursor??after})}
    return ok(session ?? null, { mode: "demo-replay" });
  }

  try {
    if(eventsMode){const events=await getHCompanySessionEvents(sessionId,personaId);return ok(events.filter(e=>e.cursor>after),{mode:"h-company-events",cursor:events.at(-1)?.cursor??after})}
    return ok(await getHCompanySessionStatus(sessionId, personaId), {
      mode: "h-company",
    });
  } catch {
    return fail(
      "provider_failure",
      "Could not fetch H Company session status.",
      502,
    );
  }
}
