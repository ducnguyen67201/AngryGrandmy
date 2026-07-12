import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { createScreenNarration } from "@/lib/audio/screen-narration";
import { POST } from "./route";

vi.mock("@/lib/audio/screen-narration", () => ({
  createScreenNarration: vi.fn(async () => ({
    source: "openai",
    text: "Casey studies the visible call-to-action before choosing the next step.",
    x: 53,
    y: 55,
  })),
}));

describe("POST /api/screen-narration", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("resolves local H frame proxy URLs to data images before calling vision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    ));
    const frameUrl = "/api/h-frame?sessionId=session-1&source=https%3A%2F%2Fagp.eu.hcompany.ai%2Fframe.png";

    const response = await POST(new NextRequest("http://localhost/api/screen-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: frameUrl,
        personaName: "Casey",
        personaDescription: "Low-confidence desktop user who needs clear labels.",
        objective: "Find the primary workflow.",
        currentUrl: "https://gettrustloop.app/",
      }),
    }));

    expect(response.status).toBe(200);
    expect(createScreenNarration).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: "data:image/png;base64,iVBORw==",
    }));
  });
});
