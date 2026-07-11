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
});
