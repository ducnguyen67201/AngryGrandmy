import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCalibration,
  saveCalibration,
  saveCalibrationMedia,
  updateCalibration,
} from "./repository";
import type { CalibrationSession } from "./calibration";

let directory = "";

function session(): CalibrationSession {
  const now = new Date().toISOString();
  return {
    id: "cal-safe-id",
    testerName: "Margaret",
    targetUrl: "https://example.com",
    objective: "Find checkout review.",
    consentedAt: now,
    status: "needs_review",
    source: "heuristic",
    transcript: null,
    media: null,
    evidence: [],
    behaviorRules: ["Read labels before clicking."],
    trustBoundaries: ["Stop before purchase."],
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("calibration repository", () => {
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "grannysmith-cal-"));
    process.env.GRANNYSMITH_CALIBRATION_FILE = path.join(directory, "records.json");
    process.env.GRANNYSMITH_CALIBRATION_MEDIA_DIR = path.join(directory, "media");
  });

  afterEach(async () => {
    delete process.env.GRANNYSMITH_CALIBRATION_FILE;
    delete process.env.GRANNYSMITH_CALIBRATION_MEDIA_DIR;
    await rm(directory, { recursive: true, force: true });
  });

  it("stores validated sessions and updates approval atomically", async () => {
    await saveCalibration(session());
    const approved = await updateCalibration("cal-safe-id", (current) => ({
      ...current,
      status: "approved",
      approvedAt: new Date().toISOString(),
    }));

    expect(approved.status).toBe("approved");
    expect((await getCalibration("cal-safe-id"))?.approvedAt).toBeTruthy();
    expect(JSON.parse(await readFile(process.env.GRANNYSMITH_CALIBRATION_FILE!, "utf8"))).toHaveLength(1);
  });

  it("stores media under a generated filename with private permissions", async () => {
    const stored = await saveCalibrationMedia({
      calibrationId: "cal-safe-id",
      bytes: Buffer.from("recording"),
      mimeType: "video/webm",
    });

    expect(stored.filename).toBe("cal-safe-id.webm");
    expect(stored.byteLength).toBe(9);
    expect((await stat(path.join(directory, "media", stored.filename))).mode & 0o777).toBe(0o600);
  });
});
