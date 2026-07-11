import { afterEach, describe, expect, it, vi } from "vitest";

import { createScreenNarration } from "./screen-narration";

describe("createScreenNarration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks OpenAI vision for one concise in-persona thought about the frame", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: "Oh, I see a lot of text, but I cannot tell what to press next.",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createScreenNarration({
      imageUrl: "data:image/png;base64,frame",
      personaName: "Linda",
      personaDescription: "An older adult who is new to web apps.",
      objective: "Find the primary workflow.",
      currentUrl: "https://example.com/path",
    });

    expect(result).toEqual({
      source: "openai",
      text: "Oh, I see a lot of text, but I cannot tell what to press next.",
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.input[1].content).toContainEqual({
      type: "input_image",
      image_url: "data:image/png;base64,frame",
    });
    expect(JSON.stringify(body)).toContain("older adult");
  });

  it("returns a safe screen-aware fallback when vision is unavailable", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(createScreenNarration({
      imageUrl: "data:image/png;base64,frame",
      personaName: "Linda",
      personaDescription: "Careful first-time visitor.",
      objective: "Find the checkout.",
      currentUrl: "https://shop.example/checkout",
    })).resolves.toEqual({
      source: "fallback",
      text: "I’m looking at this page now, but I need a moment to understand what I should do next.",
    });
  });
});
