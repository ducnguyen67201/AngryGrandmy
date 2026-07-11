import {
  ProductAnalysisSchema,
  type NormalizedSession,
  type PersonaScenario,
  type ProductAnalysis,
} from "@/lib/schemas/run";
import type { CalibrationEvidenceType } from "./calibration";

export function isUserSuppliedPersona(persona: PersonaScenario) {
  return persona.id.startsWith("custom-") || persona.id.startsWith("calibrated-");
}

export function mergeCalibratedPersona(
  analysis: ProductAnalysis,
  persona: PersonaScenario,
) {
  const generated = analysis.personas.filter(
    (candidate) => !isUserSuppliedPersona(candidate),
  );
  const otherUserPersonas = analysis.personas.filter(
    (candidate) =>
      isUserSuppliedPersona(candidate) && candidate.id !== persona.id,
  );
  const available = Math.max(0, 4 - otherUserPersonas.length);
  return ProductAnalysisSchema.parse({
    ...analysis,
    personas: [
      ...generated.slice(0, available),
      ...otherUserPersonas,
      persona,
    ],
  });
}

export function evidenceTypesFromSession(session: NormalizedSession | undefined) {
  if (!session?.finding) return [] as CalibrationEvidenceType[];
  const types = new Set<CalibrationEvidenceType>();
  for (const event of session.finding.frictionEvents) {
    const text = `${event.observation} ${event.visibleEvidence}`.toLowerCase();
    if (event.category === "trust") types.add("trust_concern");
    if (event.category === "recovery") types.add("recovery");
    if (event.category === "clarity" || event.category === "accessibility") {
      types.add("hesitation");
    }
    if (event.category === "navigation") {
      types.add(/went back|returned|previous|backtrack/.test(text) ? "backtrack" : "hesitation");
    }
    if (/misclick|wrong control|accidental/.test(text)) types.add("misclick");
  }
  if (session.finding.completion === "success") types.add("success");
  return [...types];
}
