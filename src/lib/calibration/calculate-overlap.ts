import type { CalibrationEvidenceType } from "./calibration";

type ObservedEvidence = {
  type: CalibrationEvidenceType;
  observation: string;
  confidence: number;
};

export type BehaviorOverlap = {
  score: number | null;
  label: "low" | "moderate" | "high" | "insufficient_evidence";
  reproducedCount: number;
  totalObserved: number;
  reproducedTypes: CalibrationEvidenceType[];
  missedTypes: CalibrationEvidenceType[];
};

export function calculateBehaviorOverlap(
  observed: ObservedEvidence[],
  reproduced: CalibrationEvidenceType[],
): BehaviorOverlap {
  const observedTypes = [...new Set(observed.map((item) => item.type))];
  if (observedTypes.length === 0) {
    return {
      score: null,
      label: "insufficient_evidence",
      reproducedCount: 0,
      totalObserved: 0,
      reproducedTypes: [],
      missedTypes: [],
    };
  }

  const reproducedSet = new Set(reproduced);
  const reproducedTypes = observedTypes.filter((type) => reproducedSet.has(type));
  const missedTypes = observedTypes.filter((type) => !reproducedSet.has(type));
  const score = Math.round((reproducedTypes.length / observedTypes.length) * 100);

  return {
    score,
    label: score >= 80 ? "high" : score >= 50 ? "moderate" : "low",
    reproducedCount: reproducedTypes.length,
    totalObserved: observedTypes.length,
    reproducedTypes,
    missedTypes,
  };
}
