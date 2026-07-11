import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const sessionId = "1d890a31-7648-423b-bcdb-30b8c83cc930";
const source = `https://agp.eu.hcompany.ai/api/v1/trajectories/${sessionId}/resources/product/frame.png`;

describe("GET /api/h-frame", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.HAI_API_KEY;
  });

  it("fetches a validated H frame with the server credential", async () => {
    process.env.HAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest(
      `http://localhost/api/h-frame?sessionId=${sessionId}&source=${encodeURIComponent(source)}`,
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledWith(
      source,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
        redirect: "error",
      }),
    );
  });

  it("rejects an arbitrary source without fetching it", async () => {
    process.env.HAI_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = new NextRequest(
      `http://localhost/api/h-frame?sessionId=${sessionId}&source=${encodeURIComponent("https://attacker.example/private")}`,
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
