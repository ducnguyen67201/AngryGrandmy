import { describe, expect, it } from "vitest";
import {
  buildHFrameProxyUrl,
  validateHFrameSource,
  validateHFrameRedirect,
} from "./h-frame-source";

const sessionId = "1d890a31-7648-423b-bcdb-30b8c83cc930";
const source = `https://agp.eu.hcompany.ai/api/v1/trajectories/${sessionId}/resources/product/frame.png?signature=test`;

describe("H frame source validation", () => {
  it("accepts an H resource belonging to the requested session", () => {
    expect(validateHFrameSource(source, sessionId).href).toBe(source);
    expect(buildHFrameProxyUrl(sessionId, source)).toContain("/api/h-frame?");
  });

  it("rejects arbitrary hosts and mismatched sessions", () => {
    expect(() =>
      validateHFrameSource("https://attacker.example/frame.png", sessionId),
    ).toThrow("Invalid H frame source");
    expect(() =>
      validateHFrameSource(
        "https://agp.eu.hcompany.ai/api/v1/trajectories/another-session/resources/frame.png",
        sessionId,
      ),
    ).toThrow("Invalid H frame source");
  });

  it("allows only HTTPS Amazon S3 frame redirects", () => {
    expect(
      validateHFrameRedirect(
        "https://screenshots.s3.amazonaws.com/frame.png?signature=test",
      ).hostname,
    ).toBe("screenshots.s3.amazonaws.com");
    expect(() =>
      validateHFrameRedirect("http://127.0.0.1/private"),
    ).toThrow("Invalid H frame redirect");
    expect(() =>
      validateHFrameRedirect("https://attacker.example/frame.png"),
    ).toThrow("Invalid H frame redirect");
  });
});
