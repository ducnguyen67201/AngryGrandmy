import type { RunSnapshot } from "@/lib/schemas/run";

export type PanelFeedbackTone =
  | "idle"
  | "planning"
  | "ready"
  | "dispatching"
  | "running"
  | "complete";

export type PanelFeedback = {
  tone: PanelFeedbackTone;
  title: string;
  description: string;
  personaNames: string[];
  dispatchLabel: string;
};

export function getPanelFeedback({
  snapshot,
  loading,
  dispatching,
}: {
  snapshot: RunSnapshot;
  loading: boolean;
  dispatching: boolean;
}): PanelFeedback {
  const personaNames =
    snapshot.analysis?.personas.map((persona) => persona.displayName) ?? [];

  if (loading) {
    return {
      tone: "planning",
      title: "Generating panel",
      description: "Building four realistic testers from the product URL and objective.",
      personaNames,
      dispatchLabel: "Wait for panel",
    };
  }

  if (dispatching) {
    return {
      tone: "dispatching",
      title: "Dispatching grandmas",
      description: "Starting H Company computer-use sessions for every persona.",
      personaNames,
      dispatchLabel: "Dispatching...",
    };
  }

  if (snapshot.phase === "revealing" && personaNames.length > 0) {
    return {
      tone: "ready",
      title: "Panel ready",
      description: `Review the ${personaNames.length} generated personas, then dispatch them into the product.`,
      personaNames,
      dispatchLabel: `Dispatch ${personaNames.length} Grandmas`,
    };
  }

  if (snapshot.phase === "running") {
    return {
      tone: "running",
      title: "Grandmas are testing",
      description: "H Company agents are browsing now. Results will score when sessions finish.",
      personaNames,
      dispatchLabel: "Running...",
    };
  }

  if (snapshot.report) {
    return {
      tone: "complete",
      title: "Report ready",
      description: "Evidence has been scored into a Human-Friendly report.",
      personaNames,
      dispatchLabel: `Dispatch ${Math.max(personaNames.length, 4)} Grandmas`,
    };
  }

  return {
    tone: "idle",
    title: "Ready to build panel",
    description: "Generate four synthetic testers before launching H Company agents.",
    personaNames,
    dispatchLabel: "Dispatch Grandmas",
  };
}
