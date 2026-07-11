export type ScreenNarrationRequest = {
  imageUrl: string;
  personaName: string;
  personaDescription: string;
  objective: string;
  currentUrl?: string;
};

export type ScreenNarrationResult = {
  source: "openai" | "fallback";
  text: string;
  x?: number;
  y?: number;
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ text?: unknown }> }>;
};

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_SCREEN_NARRATION_MODEL =
  process.env.OPENAI_SCREEN_NARRATION_MODEL ?? "gpt-4.1-mini";
const FALLBACK_THOUGHT =
  "I’m looking at this page now, but I need a moment to understand what I should do next.";

export async function createScreenNarration(
  request: ScreenNarrationRequest,
): Promise<ScreenNarrationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { source: "fallback", text: FALLBACK_THOUGHT };
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_SCREEN_NARRATION_MODEL,
        input: [
          {
            role: "system",
            content: [{
              type: "input_text",
              text: "You are narrating a live usability test. Identify the single visible UI element the persona is currently considering, then describe one immediate first-person thought grounded only in the screenshot. Return JSON with text (8-24 spoken words), x, and y. x/y are the element center as percentages of the full screenshot from 0 to 100. If no specific element is relevant, omit x/y.",
            }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Persona: ${request.personaName}. ${request.personaDescription}\nTask: ${request.objective}\nCurrent URL: ${request.currentUrl ?? "unknown"}`,
              },
              { type: "input_image", image_url: request.imageUrl },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
        max_output_tokens: 80,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return { source: "fallback", text: FALLBACK_THOUGHT };

    const content = readOpenAIText((await response.json()) as OpenAIResponse)?.trim();
    if (!content) return { source: "fallback", text: FALLBACK_THOUGHT };
    const parsed = parseNarrationContent(content);
    if (!parsed) return { source: "openai", text: content.slice(0, 300) };
    return {
      source: "openai",
      text: parsed.text.slice(0, 300),
      ...(validPercent(parsed.x) && validPercent(parsed.y)
        ? { x: parsed.x, y: parsed.y }
        : {}),
    };
  } catch {
    return { source: "fallback", text: FALLBACK_THOUGHT };
  }
}

function parseNarrationContent(
  content: string,
): { text: string; x?: number; y?: number } | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    return {
      text: parsed.text.trim(),
      ...(typeof parsed.x === "number" ? { x: parsed.x } : {}),
      ...(typeof parsed.y === "number" ? { y: parsed.y } : {}),
    };
  } catch {
    return null;
  }
}

function validPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function readOpenAIText(json: OpenAIResponse): string | null {
  if (typeof json.output_text === "string") return json.output_text;
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") return content.text;
    }
  }
  return null;
}
