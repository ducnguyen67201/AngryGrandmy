import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

let directory = "";

function request(overrides?: { consent?: string; video?: File }) {
  const form = new FormData();
  form.set("testerName", "Margaret");
  form.set("targetUrl", "https://example.com");
  form.set("objective", "Reach checkout review.");
  form.set("observationNotes", "I paused at the cart icon before continuing.");
  form.set("consentConfirmed", overrides?.consent ?? "true");
  form.set("researchUseConfirmed", "true");
  form.set(
    "video",
    overrides?.video ?? new File(["recording"], "session.webm", { type: "video/webm" }),
  );
  return new NextRequest("http://localhost/api/calibrations", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/calibrations", () => {
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "grannysmith-api-"));
    process.env.GRANNYSMITH_CALIBRATION_FILE = path.join(directory, "records.json");
    process.env.GRANNYSMITH_CALIBRATION_MEDIA_DIR = path.join(directory, "media");
  });

  afterEach(async () => {
    delete process.env.GRANNYSMITH_CALIBRATION_FILE;
    delete process.env.GRANNYSMITH_CALIBRATION_MEDIA_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it("creates a needs-review calibration from a validated recording", async () => {
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      testerName: "Margaret",
      status: "needs_review",
      source: "heuristic",
    });
    expect(payload.data.media).toMatchObject({ mimeType: "video/webm", byteLength: 9 });
  });

  it("rejects missing consent and unsupported media", async () => {
    expect((await POST(request({ consent: "false" }))).status).toBe(422);
    expect(
      (
        await POST(
          request({
            video: new File(["text"], "session.txt", { type: "text/plain" }),
          }),
        )
      ).status,
    ).toBe(422);
  });
});
