import {
  CalibrationEvidenceSchema,
  type CalibrationEvidence,
  type CalibrationEvidenceType,
} from "./calibration";

type ProfileInput = {
  testerName: string;
  observationNotes: string;
  transcript: string | null;
  observations: Array<
    Omit<CalibrationEvidence, "transcript"> & { transcript?: string }
  >;
};

const RULES: Record<CalibrationEvidenceType, string> = {
  hesitation: "Pause at ambiguous or icon-only controls and look for a clear text label before acting.",
  backtrack: "When the next step is unclear, return to the previous page and try a more explicit path.",
  misclick: "Treat a click that produces an unexpected result as friction and explain what was expected.",
  trust_concern: "Stop and ask for confirmation when an action could submit, purchase, book, or share data.",
  recovery: "Try one safe recovery path, then report the barrier instead of repeatedly guessing.",
  success: "Repeat the navigation strategy that produced a clear and trustworthy result.",
};

export function buildCalibrationProfile(input: ProfileInput) {
  const evidence = input.observations.map((item) =>
    CalibrationEvidenceSchema.parse(item),
  );
  const types = new Set(evidence.map((item) => item.type));
  const combined = `${input.observationNotes} ${input.transcript ?? ""}`.toLowerCase();

  if (/pause|hesitat|where is|label|icon/.test(combined)) types.add("hesitation");
  if (/went back|going back|returned|previous page|backtrack/.test(combined)) {
    types.add("backtrack");
  }
  if (/worr|trust|submit|purchase|place the order|confirm|payment/.test(combined)) {
    types.add("trust_concern");
  }

  const behaviorRules = [...types].map((type) => RULES[type]);
  if (behaviorRules.length === 0) {
    behaviorRules.push(
      `Use the observed testing approach: ${input.observationNotes.trim()}`,
    );
  }

  const trustBoundaries = types.has("trust_concern")
    ? [
        "Stop before submitting, purchasing, booking, paying, or sharing private information.",
        "Require an explicit confirmation summary before any consequential action.",
      ]
    : [
        "Stop before any irreversible action or submission.",
        "Use synthetic information only and never enter credentials.",
      ];

  return {
    evidence,
    behaviorRules: behaviorRules.slice(0, 12),
    trustBoundaries,
    disclosure:
      "This is a calibrated behavioral proxy based on observable evidence, not an impersonation or prediction of a person.",
  };
}
