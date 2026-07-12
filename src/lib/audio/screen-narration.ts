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
function fallbackAction() {
  return "Hmm, I’m looking over this page. Where should I go next?";
}

export async function createScreenNarration(
  request: ScreenNarrationRequest,
): Promise<ScreenNarrationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { source: "fallback", text: fallbackAction() };
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
              text: "Create spoken think-aloud commentary for a live computer-use replay. Speak as the persona in first person, as if they are using this screen right now. Ground the line in one visible UI element or page region and express a natural immediate reaction: recognition, curiosity, uncertainty, concern, or the next intention. Match the persona’s confidence and everyday vocabulary without turning age, disability, or inexperience into a caricature. Use brief conversational phrases and occasional interjections naturally, such as: ‘Hmm, can I click this? I’m not sure what it does.’ or ‘Oh, this looks like the button I need.’ Do not describe the persona in third person, say their name, mechanically narrate cursor movement, quote the persona profile, or reuse prewritten findings. Do not invent controls, outcomes, or facts that are not visible. Return JSON with text (8-22 spoken words), x, and y. x/y are the attended element’s center as percentages of the full screenshot from 0 to 100. If no specific element is relevant, omit x/y.",
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
    if (!response.ok) return { source: "fallback", text: fallbackAction() };

    const content = readOpenAIText((await response.json()) as OpenAIResponse)?.trim();
    if (!content) return { source: "fallback", text: fallbackAction() };
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
    return { source: "fallback", text: fallbackAction() };
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
