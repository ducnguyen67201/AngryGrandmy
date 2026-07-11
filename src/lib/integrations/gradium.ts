export type VoiceReactionRequest = {
  personaId: string;
  voiceSlot: 0 | 1 | 2 | 3;
  text: string;
};

export type VoiceReaction = {
  configured: boolean;
  source: "gradium" | "text";
  audioUrl: string | null;
  audioBase64: string | null;
  transcript: string;
};

export async function createVoiceReaction(
  request: VoiceReactionRequest,
): Promise<VoiceReaction> {
  const apiKey = process.env.GRADIUM_API_KEY;
  const endpoint = process.env.GRADIUM_API_URL;

  if (!apiKey || !endpoint) {
    return textFallback(request.text);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text: request.text,
        voice: process.env[`GRADIUM_VOICE_${request.voiceSlot}`] ?? "grandma",
        personaId: request.personaId,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error(`Gradium failed with ${response.status}`);
    const json = (await response.json()) as Record<string, unknown>;

    return {
      configured: true,
      source: "gradium",
      audioUrl: typeof json.audioUrl === "string" ? json.audioUrl : null,
      audioBase64:
        typeof json.audioBase64 === "string" ? json.audioBase64 : null,
      transcript: request.text,
    };
  } catch {
    return textFallback(request.text, true);
  }
}

function textFallback(text: string, configured = false): VoiceReaction {
  return {
    configured,
    source: "text",
    audioUrl: null,
    audioBase64: null,
    transcript: text,
  };
}
