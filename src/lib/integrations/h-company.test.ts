import { afterEach, describe, expect, it, vi } from "vitest";
import { createHCompanySession } from "./h-company";
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
});
