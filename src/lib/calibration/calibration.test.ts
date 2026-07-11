import { describe, expect, it } from "vitest";
import {
  CalibrationSessionSchema,
  validateCalibrationSubmission,
} from "./calibration";

const submission = {
  testerName: "Margaret",
  targetUrl: "https://example.com/checkout",
  objective: "Reach checkout review without placing an order.",
  consentConfirmed: true,
  researchUseConfirmed: true,
  observationNotes: "I paused at the unlabeled cart icon and went back once.",
};

describe("calibration contracts", () => {
  it("accepts an explicitly consented public-URL calibration", () => {
    expect(validateCalibrationSubmission(submission)).toMatchObject({
      testerName: "Margaret",
      consentConfirmed: true,
      researchUseConfirmed: true,
    });
  });

  it("rejects missing consent and private targets", () => {
    expect(() =>
      validateCalibrationSubmission({
        ...submission,
        consentConfirmed: false,
      }),
    ).toThrow();
    expect(() =>
      validateCalibrationSubmission({
        ...submission,
        targetUrl: "http://127.0.0.1/private",
      }),
    ).toThrow(/private|localhost/i);
  });

  it("requires human approval before a profile becomes dispatchable", () => {
    const base = {
      id: "cal-1",
      testerName: "Margaret",
      targetUrl: submission.targetUrl,
      objective: submission.objective,
      consentedAt: new Date().toISOString(),
      status: "needs_review",
      source: "heuristic",
      transcript: null,
      media: null,
      evidence: [],
      behaviorRules: ["Reads labels before clicking."],
      trustBoundaries: ["Stop before placing an order."],
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(CalibrationSessionSchema.parse(base).status).toBe("needs_review");
    expect(() =>
      CalibrationSessionSchema.parse({
        ...base,
        status: "approved",
        approvedAt: null,
      }),
    ).toThrow();
  });
});
