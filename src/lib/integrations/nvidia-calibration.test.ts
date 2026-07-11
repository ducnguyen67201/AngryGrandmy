import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeCalibration } from "./nvidia-calibration";

const input = {
  testerName: "Margaret",
  targetUrl: "https://example.com",
  objective: "Reach checkout review.",
  observationNotes: "I paused at the cart icon and worried about placing an order.",
  frames: ["data:image/jpeg;base64,ZmFrZQ=="],
  media: null,
};

describe("analyzeCalibration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_VSS_URL;
  });

  it("returns a reviewable heuristic profile without configured services", async () => {
    const result = await analyzeCalibration(input);

    expect(result.source).toBe("heuristic");
    expect(result.profile.behaviorRules.join(" ")).toMatch(/icon|label/i);
    expect(result.fallbackReason).toMatch(/not configured/i);
  });

  it("uses Nemotron frame evidence and validates its structured response", async () => {
    process.env.NVIDIA_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    transcript: null,
                    observations: [
                      {
                        startMs: 2000,
                        endMs: 5000,
                        type: "hesitation",
                        observation: "Pointer paused at the cart icon.",
                        confidence: 0.88,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await analyzeCalibration(input);

    expect(result.source).toBe("nvidia");
    expect(result.profile.evidence[0]).toMatchObject({
      type: "hesitation",
      confidence: 0.88,
    });
  });

  it("falls back safely when a model returns malformed output", async () => {
    process.env.NVIDIA_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await analyzeCalibration(input);

    expect(result.source).toBe("heuristic");
    expect(result.fallbackReason).toMatch(/failed/i);
  });
});
