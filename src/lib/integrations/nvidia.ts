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
  const baseUrl =
    process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  const model =
    process.env.NVIDIA_MODEL ??
    process.env.NVIDIA_HEATMAP_MODEL ??
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

  if (!apiKey) {
    return heuristicVisionResult(request.observation);
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a visual usability judge for synthetic computer-use testing. Return JSON only.",
          },
          {
            role: "user",
            content: buildJudgeContent(request),
          },
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 800,
        chat_template_kwargs: { enable_thinking: false },
        reasoning_budget: 0,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) throw new Error(`NVIDIA vision failed ${response.status}`);
    const completion = (await response.json()) as NvidiaChatCompletion;
    const parsed = parseJudgeResponse(readCompletionContent(completion));

    return {
      configured: true,
      source: "nvidia",
      label: parsed.label,
      confidence: parsed.confidence,
      notes: parsed.notes,
    };
  } catch {
    return heuristicVisionResult(request.observation, true);
  }
}

type NvidiaChatCompletion = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

type ParsedJudgeResponse = {
  label: string;
  confidence: number;
  notes: string[];
};

function buildJudgeContent(request: VisionJudgeRequest) {
  const prompt = [
    "Judge the UI friction described below for a non-technical older adult persona.",
    "Return strict JSON with this shape:",
    JSON.stringify({
      label:
        "navigation_confusion | visual_affordance_risk | accessibility_risk | trust_gap | technical_risk | low_risk",
      confidence: 0.82,
      notes: ["Concrete visual or interaction evidence."],
    }),
    `Observation: ${request.observation}`,
  ].join("\n\n");

  if (!request.screenshotDataUrl) return prompt;

  return [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: request.screenshotDataUrl } },
  ];
}

function readCompletionContent(completion: NvidiaChatCompletion): string {
  const content = completion.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const text = (item as Record<string, unknown>).text;
        return typeof text === "string" ? text : "";
      })
      .join("\n");
  }

  return "";
}

function parseJudgeResponse(content: string): ParsedJudgeResponse {
  const fallback = {
    label: "ui_friction",
    confidence: 0.72,
    notes: ["NVIDIA visual judge returned a result."],
  };

  const jsonText = extractJsonObject(content);
  if (!jsonText) return fallback;

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : fallback.confidence;
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.filter((note): note is string => typeof note === "string")
      : fallback.notes;

    return {
      label: typeof parsed.label === "string" ? parsed.label : fallback.label,
      confidence,
      notes: notes.length > 0 ? notes.slice(0, 4) : fallback.notes,
    };
  } catch {
    return fallback;
  }
}

function extractJsonObject(content: string): string | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) return fenced.trim();

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  return content.slice(start, end + 1);
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
      configured
        ? "Fallback judge used because the NVIDIA Nemotron endpoint failed."
        : "Fallback judge used because NVIDIA_API_KEY is not configured.",
    ],
  };
}
