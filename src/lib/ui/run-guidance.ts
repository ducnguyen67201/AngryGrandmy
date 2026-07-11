import type { RunSnapshot, UsabilityReport } from "@/lib/schemas/run";

export type RunStepId = "website" | "personas" | "dispatch" | "evidence" | "decision";
export type RunStepStatus = "upcoming" | "active" | "complete";

export type RunGuidance = {
  activeStep: RunStepId;
  steps: Array<{
    id: RunStepId;
    label: string;
    description: string;
    status: RunStepStatus;
  }>;
  nextAction: {
    eyebrow: string;
    title: string;
    detail: string;
    recommendation: string | null;
  };
};

const STEP_DEFINITIONS: Array<Omit<RunGuidance["steps"][number], "status">> = [
  { id: "website", label: "Add website", description: "URL + objective" },
  { id: "personas", label: "Generate tasks", description: "Four grandma personas" },
  { id: "dispatch", label: "Run agents", description: "Computer-use sessions" },
  { id: "evidence", label: "Collect evidence", description: "Runs + heatmap + score" },
  { id: "decision", label: "What next", description: "Fix, rerun, or expand" },
];

export function getRunGuidance({
  snapshot,
  loading,
  dispatching,
}: {
  snapshot: RunSnapshot;
  loading: boolean;
  dispatching: boolean;
}): RunGuidance {
  const activeStep = getActiveStep(snapshot, loading, dispatching);
  const activeIndex = STEP_DEFINITIONS.findIndex((step) => step.id === activeStep);
  const steps = STEP_DEFINITIONS.map((step, index) => ({
    ...step,
    status: (index < activeIndex
      ? "complete"
      : index === activeIndex
        ? "active"
        : "upcoming") as RunStepStatus,
  }));

  return {
    activeStep,
    steps,
    nextAction: getNextAction(snapshot, loading, dispatching),
  };
}

function getActiveStep(
  snapshot: RunSnapshot,
  loading: boolean,
  dispatching: boolean,
): RunStepId {
  if (loading || snapshot.phase === "analyzing") return "personas";
  if (dispatching || snapshot.phase === "revealing") return "dispatch";
  if (snapshot.phase === "running") {
    return snapshot.sessions.some((session) =>
      ["queued", "pending", "running", "paused"].includes(session.status),
    )
      ? "dispatch"
      : "evidence";
  }
  if (snapshot.report || snapshot.phase === "report") return "decision";
  return "website";
}

function getNextAction(
  snapshot: RunSnapshot,
  loading: boolean,
  dispatching: boolean,
): RunGuidance["nextAction"] {
  if (loading || snapshot.phase === "analyzing") {
    return {
      eyebrow: "In progress",
      title: "Generating persona tasks",
      detail: "The product and objective are being translated into four distinct, safety-bounded tasks.",
      recommendation: null,
    };
  }

  if (dispatching) {
    return {
      eyebrow: "In progress",
      title: "Dispatching computer-use agents",
      detail: "Each approved persona task is starting in its own H Company session.",
      recommendation: null,
    };
  }

  if (snapshot.phase === "revealing" && snapshot.analysis) {
    return {
      eyebrow: "Next action",
      title: "Review tasks, then dispatch the panel",
      detail: "Check each task and stop condition before releasing the four agents.",
      recommendation: snapshot.analysis.personas[0]?.task ?? null,
    };
  }

  if (snapshot.phase === "running") {
    const activeCount = snapshot.sessions.filter((session) =>
      ["queued", "pending", "running", "paused"].includes(session.status),
    ).length;

    return {
      eyebrow: activeCount > 0 ? "Running now" : "Finalizing",
      title: activeCount > 0 ? "Watch the agents test" : "Collect evidence and score",
      detail:
        activeCount > 0
          ? `${activeCount} session${activeCount === 1 ? " is" : "s are"} still active. Results will be collected automatically.`
          : "The sessions are complete. Final answers are being normalized into hotspots and score dimensions.",
      recommendation: null,
    };
  }

  if (snapshot.report) return reportNextAction(snapshot.report);

  return {
    eyebrow: "Start here",
    title: "Add the website and objective",
    detail: "Use a site you own or are authorized to test, then describe the safe workflow to evaluate.",
    recommendation: null,
  };
}

function reportNextAction(report: UsabilityReport): RunGuidance["nextAction"] {
  if (report.completedCount === 0 && report.topRecommendations.length === 0) {
    return {
      eyebrow: "Run incomplete",
      title: "Rerun the panel",
      detail: "No scorable product evidence was captured. Check the provider sessions and dispatch again.",
      recommendation: null,
    };
  }

  const weakest = weakestDimension(report);
  const recommendation = report.topRecommendations[0] ?? null;

  if (report.score < 80) {
    return {
      eyebrow: "Recommended next",
      title: report.score < 50 ? "Fix critical blockers before retesting" : "Fix the top blocker, then rerun",
      detail: `${weakest.label} is the weakest dimension at ${weakest.earned}/${weakest.max}. Apply the highest-impact fix and rerun the same personas to compare the score.`,
      recommendation,
    };
  }

  return {
    eyebrow: "Recommended next",
    title: "Expand coverage",
    detail: `The run scored ${report.score}/100. Keep the current fixes and test another key workflow, viewport, or lower-confidence persona.`,
    recommendation,
  };
}

function weakestDimension(report: UsabilityReport) {
  const dimensions = [
    { label: "Completion", earned: report.dimensions.completion, max: 40 },
    { label: "Efficiency", earned: report.dimensions.efficiency, max: 20 },
    { label: "Clarity", earned: report.dimensions.clarity, max: 15 },
    { label: "Recovery", earned: report.dimensions.recovery, max: 15 },
    { label: "Trust", earned: report.dimensions.trust, max: 10 },
  ];

  return dimensions.reduce((weakest, dimension) =>
    dimension.earned / dimension.max < weakest.earned / weakest.max ? dimension : weakest,
  );
}
