import type { ProductAnalysis } from "@/lib/schemas/run";

export type PanelReviewItem = {
  id: string;
  displayName: string;
  tagline: string;
  digitalConfidence: string;
  context: string;
  task: string;
  stopCondition: string;
  launchState: "launching" | "standby";
  selected: boolean;
};

export function buildPanelReviewItems({
  analysis,
  testerCount,
  selectedPersonaId,
}: {
  analysis: ProductAnalysis | null;
  testerCount: number;
  selectedPersonaId: string | null;
}): PanelReviewItem[] {
  if (!analysis) return [];

  return analysis.personas.map((persona, index) => ({
    id: persona.id,
    displayName: persona.displayName,
    tagline: persona.tagline,
    digitalConfidence: persona.digitalConfidence,
    context: persona.context,
    task: persona.task,
    stopCondition: persona.stopConditions[0] ?? "Stop before irreversible action.",
    launchState: index < testerCount ? "launching" : "standby",
    selected: persona.id === selectedPersonaId,
  }));
}
