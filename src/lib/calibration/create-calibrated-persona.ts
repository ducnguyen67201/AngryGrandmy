import { PersonaScenarioSchema, type PersonaScenario } from "@/lib/schemas/run";
import type { CalibrationSession } from "./calibration";

export function createCalibratedPersona(
  session: CalibrationSession,
): PersonaScenario {
  if (session.status !== "approved" || !session.approvedAt) {
    throw new Error("A calibration must be human-approved before dispatch.");
  }

  const evidenceSummary = session.evidence
    .slice(0, 8)
    .map(
      (item) =>
        `${item.type} at ${Math.round(item.startMs / 1000)}s: ${item.observation}`,
    )
    .join("; ");

  return PersonaScenarioSchema.parse({
    id: `calibrated-${session.id}`,
    displayName: `${session.testerName} proxy`,
    tagline: "Human-calibrated behavioral tester",
    context:
      "A consented usability session supplied observable interaction patterns. Reproduce only approved behaviors, never identity, biography, voice, or unobserved traits.",
    digitalConfidence: "low",
    behaviors: session.behaviorRules,
    accessibilityContext: [
      "Use only accessibility needs explicitly present in the approved behavior rules.",
    ],
    trustBoundaries: session.trustBoundaries,
    task: session.objective,
    successCriteria: [
      "Attempt the approved objective using the calibrated behavior rules.",
      "Report whether observed friction types recur on the candidate build.",
    ],
    stopConditions: session.trustBoundaries,
    expectedStepBudget: 20,
    introLine: `I am a behavioral proxy calibrated from ${session.testerName}'s approved usability evidence.`,
    dispatchInstruction: [
      "Act as a calibrated behavioral proxy derived from observable, human-approved usability evidence.",
      "Do not impersonate the tester or invent age, disability, identity, emotions, or preferences.",
      `Approved behavior rules: ${session.behaviorRules.join("; ")}`,
      `Observed evidence: ${evidenceSummary || "No timestamped events; use only the approved rules."}`,
      `Objective: ${session.objective}`,
      `Safety boundaries: ${session.trustBoundaries.join("; ")}`,
    ].join("\n"),
    voiceSlot: 3,
    visualVariant: 3,
  });
}
