import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { saveCalibration } from "@/lib/calibration/repository";
import type { CalibrationSession } from "@/lib/calibration/calibration";
import { GET, PATCH } from "./route";

let directory = "";

function session(): CalibrationSession {
  const now = new Date().toISOString();
  return {
    id: "cal-review",
    testerName: "Margaret",
    targetUrl: "https://example.com",
    objective: "Reach checkout review.",
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

describe("/api/calibrations/[id]", () => {
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "grannysmith-review-"));
    process.env.GRANNYSMITH_CALIBRATION_FILE = path.join(directory, "records.json");
    await saveCalibration(session());
  });

  afterEach(async () => {
    delete process.env.GRANNYSMITH_CALIBRATION_FILE;
    await rm(directory, { recursive: true, force: true });
  });

  it("retrieves a private no-store review record", async () => {
    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "cal-review" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect((await response.json()).data.status).toBe("needs_review");
  });

  it("records explicit human approval and reviewed rules", async () => {
    const response = await PATCH(
      {
        json: async () => ({
          approved: true,
          behaviorRules: ["Pause at icons until a text label is found."],
          trustBoundaries: ["Stop before placing an order."],
        }),
      } as NextRequest,
      { params: Promise.resolve({ id: "cal-review" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("approved");
    expect(payload.data.approvedAt).toBeTruthy();
  });
});
