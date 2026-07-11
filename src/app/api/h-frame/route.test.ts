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
    const [requestedUrl, init] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(requestedUrl.href).toBe(source);
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer test-key",
    );
    expect(init.redirect).toBe("manual");
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

  it("follows a validated S3 redirect without forwarding the H credential", async () => {
    process.env.HAI_API_KEY = "test-key";
    const signedFrame =
      "https://screenshots.s3.amazonaws.com/frame.png?signature=test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: signedFrame },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/h-frame?sessionId=${sessionId}&source=${encodeURIComponent(source)}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [redirectUrl, redirectInit] = fetchMock.mock.calls[1] as [
      URL,
      RequestInit,
    ];
    expect(redirectUrl.href).toBe(signedFrame);
    expect(new Headers(redirectInit.headers).has("Authorization")).toBe(false);
  });

  it("does not follow an unsafe provider redirect", async () => {
    process.env.HAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "http://127.0.0.1/private" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/h-frame?sessionId=${sessionId}&source=${encodeURIComponent(source)}`,
      ),
    );

    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
