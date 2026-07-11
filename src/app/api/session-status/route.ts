import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/responses";
import { createDemoRun } from "@/lib/fixtures/demo-run";
import {
  getHCompanySessionStatus,
  isHCompanyConfigured,
} from "@/lib/integrations/h-company";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const personaId = req.nextUrl.searchParams.get("personaId") ?? "linda";

  if (!sessionId) {
    return fail("missing_session_id", "sessionId is required.", 400);
  }

  if (!isHCompanyConfigured() || sessionId.startsWith("demo-")) {
    const session = createDemoRun().sessions.find(
      (item) => item.sessionId === sessionId || item.personaId === personaId,
    );
    return ok(session ?? null, { mode: "demo-replay" });
  }

  try {
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
