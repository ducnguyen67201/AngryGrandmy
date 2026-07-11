export type VisionJudgeRequest = {
  screenshotDataUrl?: string;
  observation: string;
};

export type VisionJudgeResult = {
  configured: boolean;
  source: "nvidia" | "heuristic";
  label: string;
  confidence: number;
  notes: string[];
};

export async function judgeVision(
  request: VisionJudgeRequest,
): Promise<VisionJudgeResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const endpoint = process.env.NVIDIA_NEOCLAW_URL;

  if (!apiKey || !endpoint || !request.screenshotDataUrl) {
    return heuristicVisionResult(request.observation);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) throw new Error(`NVIDIA vision failed ${response.status}`);
    const json = (await response.json()) as Record<string, unknown>;

    return {
      configured: true,
      source: "nvidia",
      label: typeof json.label === "string" ? json.label : "ui_friction",
      confidence:
        typeof json.confidence === "number" ? json.confidence : 0.72,
      notes: Array.isArray(json.notes)
        ? json.notes.filter((note): note is string => typeof note === "string")
        : ["NVIDIA vision adapter returned a result."],
    };
  } catch {
    return heuristicVisionResult(request.observation, true);
  }
}

function heuristicVisionResult(
  observation: string,
  configured = false,
): VisionJudgeResult {
  return {
    configured,
    source: "heuristic",
    label: /icon|tiny|small|unlabeled/i.test(observation)
      ? "visual_affordance_risk"
      : "ui_friction",
    confidence: 0.61,
    notes: [
      "Fallback judge used because NVIDIA/NemoClaw endpoint is not configured or failed.",
    ],
  };
}
