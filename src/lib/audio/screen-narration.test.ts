import { afterEach, describe, expect, it, vi } from "vitest";

import { createScreenNarration } from "./screen-narration";

describe("createScreenNarration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks OpenAI vision for concise visible action commentary about the frame", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({
        text: "Linda is scanning the dense copy and looking for the next clear button.",
        x: 46,
        y: 62,
      }),
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
      text: "Linda is scanning the dense copy and looking for the next clear button.",
      x: 46,
      y: 62,
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.input[1].content).toContainEqual({
      type: "input_image",
      image_url: "data:image/png;base64,frame",
    });
    expect(JSON.stringify(body)).toContain("older adult");
    expect(JSON.stringify(body)).toContain("visible action");
    expect(JSON.stringify(body)).toContain("Do not quote");
    expect(body.text.format.type).toBe("json_object");
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
      text: "Linda is reviewing the current page and looking for the next action.",
    });
  });

  it("reads nested Responses API text and falls back on provider errors", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: [{ content: [{ text: "This section is dense; where did the main action go?" }] }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      imageUrl: "data:image/png;base64,frame",
      personaName: "Linda",
      personaDescription: "Careful first-time visitor.",
      objective: "Find the main action.",
    };

    await expect(createScreenNarration(request)).resolves.toEqual({
      source: "openai",
      text: "This section is dense; where did the main action go?",
    });
    await expect(createScreenNarration(request)).resolves.toMatchObject({
      source: "fallback",
    });
  });

  it("falls back when a successful response contains no spoken text", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output: [{ content: [{}] }] }), { status: 200 }),
    ));

    await expect(createScreenNarration({
      imageUrl: "data:image/png;base64,frame",
      personaName: "Linda",
      personaDescription: "Careful first-time visitor.",
      objective: "Find the main action.",
    })).resolves.toMatchObject({ source: "fallback" });
  });

  it("omits vision coordinates when the model reports an invalid point", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({ text: "I cannot find the control.", x: 140, y: -3 }),
    }), { status: 200 })));

    await expect(createScreenNarration({
      imageUrl: "data:image/png;base64,frame",
      personaName: "Linda",
      personaDescription: "Careful first-time visitor.",
      objective: "Find the main action.",
    })).resolves.toEqual({ source: "openai", text: "I cannot find the control." });
  });
});
