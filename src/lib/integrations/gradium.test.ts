import { afterEach, describe, expect, it, vi } from "vitest";
import { createVoiceReaction } from "./gradium";

describe("Gradium persona voice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the mature, calm Holly catalog voice by default", async () => {
    vi.stubEnv("GRADIUM_API_KEY", "test-key");
    vi.stubEnv("GRADIUM_VOICE_ID", "");
    vi.stubEnv("GRADIUM_VOICE_0", "");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    await createVoiceReaction({
      personaId: "linda",
      voiceSlot: 0,
      text: "Where is that button?",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.voice_id).toBe("7c5UOKm7AiBgJADg");
  });

  it("returns a browser-readable text fallback when Gradium is not configured", async () => {
    vi.stubEnv("GRADIUM_API_KEY", "");

    const result = await createVoiceReaction({
      personaId: "linda",
      voiceSlot: 0,
      text: "I cannot find the next step.",
    });

    expect(result).toMatchObject({
      configured: false,
      source: "text",
      transcript: "I cannot find the next step.",
    });
  });

  it("falls back safely when the configured Gradium endpoint fails", async () => {
    vi.stubEnv("GRADIUM_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    const result = await createVoiceReaction({
      personaId: "linda",
      voiceSlot: 0,
      text: "This button worries me.",
    });

    expect(result).toMatchObject({
      configured: true,
      source: "text",
      transcript: "This button worries me.",
    });
  });
});
