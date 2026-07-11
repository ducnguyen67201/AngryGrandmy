import { afterEach, describe, expect, it, vi } from "vitest";
import { judgeVision } from "./nvidia";

describe("judgeVision", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses heuristic fallback without an NVIDIA key", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");

    const result = await judgeVision({
      observation: "The icon is tiny and unlabeled.",
    });

    expect(result).toMatchObject({
      configured: false,
      source: "heuristic",
      label: "visual_affordance_risk",
    });
  });

  it("calls the NVIDIA OpenAI-compatible chat endpoint when configured", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-nvidia-key");
    vi.stubEnv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1");
    vi.stubEnv(
      "NVIDIA_MODEL",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    );

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  label: "accessibility_risk",
                  confidence: 0.88,
                  notes: ["The primary button is visually low contrast."],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await judgeVision({
      observation: "The primary button is hard to see.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-nvidia-key",
        }),
      }),
    );
    const body = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(body.model).toBe("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning");
    expect(result).toMatchObject({
      configured: true,
      source: "nvidia",
      label: "accessibility_risk",
      confidence: 0.88,
    });
  });

  it("falls back safely when the NVIDIA endpoint fails", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "test-nvidia-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad gateway", { status: 502 }),
    );

    const result = await judgeVision({
      observation: "The page shows a confusing error.",
    });

    expect(result).toMatchObject({
      configured: true,
      source: "heuristic",
      label: "ui_friction",
    });
    expect(result.notes[0]).toContain("NVIDIA Nemotron endpoint failed");
  });
});
