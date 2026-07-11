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
              text: "You are narrating a live usability test. Describe one immediate, natural first-person thought grounded only in the screenshot. Stay in persona, mention the visible UI that caused the reaction, use 8-24 words, and return only the spoken sentence.",
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
        max_output_tokens: 80,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return { source: "fallback", text: FALLBACK_THOUGHT };

    const text = readOpenAIText((await response.json()) as OpenAIResponse)?.trim();
    return text
      ? { source: "openai", text: text.slice(0, 300) }
      : { source: "fallback", text: FALLBACK_THOUGHT };
  } catch {
    return { source: "fallback", text: FALLBACK_THOUGHT };
  }
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
