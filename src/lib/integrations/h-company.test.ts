import { afterEach, describe, expect, it, vi } from "vitest";
import { createHCompanySession, getHCompanySessionStatus } from "./h-company";
import { createCustomPersona } from "@/lib/personas/create-custom-persona";
import { demoAnalysis } from "@/lib/fixtures/demo-run";

describe("H Company custom persona dispatch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.HAI_API_KEY;
  });

  it("includes the custom persona description in the H session prompt", async () => {
    process.env.HAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: "session-custom-alex", status: "pending" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const persona = createCustomPersona({
      displayName: "Alex",
      description:
        "A color-blind parent shopping on mobile who distrusts subscriptions.",
      digitalConfidence: "medium",
      objective: "Reach checkout review without placing an order.",
      globalSafetyBoundaries: demoAnalysis.globalSafetyBoundaries,
    });

    await createHCompanySession(
      {
        url: "https://example.com",
        objective: "Reach checkout review without placing an order.",
        authorizationConfirmed: true,
        customPersona: persona,
      },
      demoAnalysis,
      persona,
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    const prompt = body.messages[0].message as string;

    expect(body.agent).toBe("h/web-surfer-flash");
    expect(prompt).toContain("Persona: Alex - Custom mobile-minded tester");
    expect(prompt).toContain("A color-blind parent shopping on mobile");
    expect(prompt).toContain("return ONLY strict JSON");
  });

  it("normalizes H's nested live status and step count", async () => {
    process.env.HAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "session-live",
      status: { status: "running", steps: 7, outcome: null, error_code: null },
      started_at: "2026-07-11T20:00:00.000Z",
      agent_view_url: "https://platform.hcompany.ai/agents/sessions/session-live",
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const session = await getHCompanySessionStatus("session-live", "joan");
    expect(session.status).toBe("running");
    expect(session.stepCount).toBe(7);
    expect(session.latestActionLabel).toBe("H agent is running · 7 steps");
  });

  it("adds runtime and final-result contracts to generated personas", async () => {
    process.env.HAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: "session-linda", status: "pending" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await createHCompanySession({
      url: "https://example.com",
      objective: "Find the primary workflow.",
      authorizationConfirmed: true,
    }, demoAnalysis, demoAnalysis.personas[0]);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const prompt = JSON.parse(String(request.body)).messages[0].message as string;
    expect(prompt).toContain("GRANNY_EVENT");
    expect(prompt).toContain("return ONLY strict JSON");
  });
});
