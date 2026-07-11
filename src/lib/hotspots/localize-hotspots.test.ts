import { describe, expect, it, vi } from "vitest";
import { demoAnalysis, demoSessions } from "@/lib/fixtures/demo-run";
import { localizeHotspots } from "./localize-hotspots";

describe("localizeHotspots", () => {
  it("uses deterministic fallback without an OpenAI key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const result = await localizeHotspots(demoSessions, demoAnalysis);

    expect(result.mode).toBe("heuristic");
    expect(result.hotspots.length).toBeGreaterThan(0);
    expect(result.fallbackReason).toContain("OPENAI_API_KEY");
  });

  it("returns empty fallback when there are no friction events", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    const result = await localizeHotspots([], demoAnalysis);

    expect(result.mode).toBe("heuristic");
    expect(result.hotspots).toEqual([]);
  });
});
