import { z } from "zod";
import {
  buildVisualHotspots,
  type VisualHotspot,
} from "@/lib/hotspots/build-hotspots";
import type { NormalizedSession, ProductAnalysis } from "@/lib/schemas/run";

export type HotspotLocalizationResult = {
  hotspots: VisualHotspot[];
  mode: "openai" | "nvidia" | "heuristic";
  model: string | null;
  fallbackReason: string | null;
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
    }>;
  }>;
};

const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_HEATMAP_MODEL =
  process.env.OPENAI_HEATMAP_MODEL ??
  process.env.OPENAI_PERSONA_MODEL ??
  "gpt-4.1-mini";
const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
const NVIDIA_HEATMAP_MODEL =
  process.env.NVIDIA_HEATMAP_MODEL ??
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

const ModelHotspotResponseSchema = z.object({
  hotspots: z.array(
    z.object({
      id: z.string().min(1),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      label: z.string().min(1).max(80).optional(),
      confidence: z.number().min(0).max(1).optional(),
    }),
  ),
});

export async function localizeHotspots(
  sessions: NormalizedSession[],
  analysis: ProductAnalysis | null,
  screenshotDataUrl?: string,
): Promise<HotspotLocalizationResult> {
  const heuristic = buildVisualHotspots(sessions, analysis);

  if (heuristic.length === 0) {
    return {
      hotspots: [],
      mode: "heuristic",
      model: null,
      fallbackReason: "No friction events are available to localize.",
    };
  }

  if (process.env.NVIDIA_API_KEY) {
    try {
      const localized = await localizeWithNvidia(
        heuristic,
        analysis,
        screenshotDataUrl,
      );
      return {
        hotspots: localized,
        mode: "nvidia",
        model: NVIDIA_HEATMAP_MODEL,
        fallbackReason: null,
      };
    } catch (error) {
      if (!process.env.OPENAI_API_KEY) {
        return {
          hotspots: heuristic,
          mode: "heuristic",
          model: null,
          fallbackReason:
            error instanceof Error
              ? error.message
              : "NVIDIA hotspot localization failed.",
        };
      }
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      hotspots: heuristic,
      mode: "heuristic",
      model: null,
      fallbackReason: "No model localization key is configured.",
    };
  }

  try {
    const localized = await localizeWithOpenAI(
      heuristic,
      analysis,
      screenshotDataUrl,
    );
    return {
      hotspots: localized,
      mode: "openai",
      model: OPENAI_HEATMAP_MODEL,
      fallbackReason: null,
    };
  } catch (error) {
    return {
      hotspots: heuristic,
      mode: "heuristic",
      model: null,
      fallbackReason:
        error instanceof Error
          ? error.message
          : "OpenAI hotspot localization failed.",
    };
  }
}

async function localizeWithNvidia(
  heuristic: VisualHotspot[],
  analysis: ProductAnalysis | null,
  screenshotDataUrl?: string,
): Promise<VisualHotspot[]> {
  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: buildLocalizationPrompt(heuristic, analysis),
    },
  ];

  if (screenshotDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: screenshotDataUrl },
    });
  }

  const response = await fetch(
    `${NVIDIA_BASE_URL.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: NVIDIA_HEATMAP_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You localize usability friction on a web page. Return JSON only.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.2,
        top_p: 0.95,
        max_tokens: 4096,
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 2048,
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `NVIDIA hotspot localization failed with ${response.status}: ${body.slice(0, 360)}`,
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  const parsed = ModelHotspotResponseSchema.parse(parseModelJson(content));
  const updates = new Map(parsed.hotspots.map((hotspot) => [hotspot.id, hotspot]));

  return heuristic.map((hotspot) => {
    const update = updates.get(hotspot.id);
    if (!update) return hotspot;

    return {
      ...hotspot,
      x: clampPercent(update.x),
      y: clampPercent(update.y),
      label: update.label ?? hotspot.label,
    };
  });
}

async function localizeWithOpenAI(
  heuristic: VisualHotspot[],
  analysis: ProductAnalysis | null,
  screenshotDataUrl?: string,
): Promise<VisualHotspot[]> {
  const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_HEATMAP_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You localize usability friction on a web page. Return JSON only.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildLocalizationPrompt(heuristic, analysis),
            },
            ...(screenshotDataUrl
              ? [
                  {
                    type: "input_image",
                    image_url: screenshotDataUrl,
                  },
                ]
              : []),
          ],
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
    signal: AbortSignal.timeout(35_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI hotspot localization failed with ${response.status}: ${body.slice(0, 360)}`,
    );
  }

  const parsed = ModelHotspotResponseSchema.parse(
    parseModelJson(readOpenAIText((await response.json()) as OpenAIResponse)),
  );
  const updates = new Map(parsed.hotspots.map((hotspot) => [hotspot.id, hotspot]));

  return heuristic.map((hotspot) => {
    const update = updates.get(hotspot.id);
    if (!update) return hotspot;

    return {
      ...hotspot,
      x: clampPercent(update.x),
      y: clampPercent(update.y),
      label: update.label ?? hotspot.label,
    };
  });
}

function buildLocalizationPrompt(
  hotspots: VisualHotspot[],
  analysis: ProductAnalysis | null,
) {
  return JSON.stringify({
    instruction:
      "Return {\"hotspots\":[...]} with the same hotspot ids and improved x/y percentage coordinates for a web UI heatmap. Coordinates are relative to the visible page or screenshot: x=0 left, x=100 right, y=0 top, y=100 bottom. Use the friction category, evidence, and recommendation to infer likely UI location. If a screenshot image is attached, localize against it. If no screenshot is attached, infer from common web layout conventions. Do not invent new ids.",
    product: {
      name: analysis?.productName ?? "Target product",
      category: analysis?.productCategory ?? "web workflow",
      summary: analysis?.summary ?? null,
    },
    hotspots: hotspots.map((hotspot) => ({
      id: hotspot.id,
      persona: hotspot.personaName,
      category: hotspot.category,
      severity: hotspot.severity,
      evidence: hotspot.evidence,
      recommendation: hotspot.recommendation,
      currentFallbackCoordinate: { x: hotspot.x, y: hotspot.y },
    })),
  });
}

function parseModelJson(content: unknown): unknown {
  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include string output.");
  }

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI response was not valid JSON.");
    return JSON.parse(match[0]);
  }
}

function readOpenAIText(json: OpenAIResponse): unknown {
  if (typeof json.output_text === "string") return json.output_text;

  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }

  return null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}
