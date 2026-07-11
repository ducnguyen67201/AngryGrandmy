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
  audioMime: string | null;
  transcript: string;
};

const HOLLY_MATURE_CALM_VOICE_ID = "7c5UOKm7AiBgJADg";

export async function createVoiceReaction(
  request: VoiceReactionRequest,
): Promise<VoiceReaction> {
  const apiKey = process.env.GRADIUM_API_KEY;
  const endpoint =
    process.env.GRADIUM_API_URL ??
    "https://api.gradium.ai/api/post/speech/tts";

  if (!apiKey || !endpoint) {
    return textFallback(request.text);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        text: request.text,
        voice_id: [
          process.env[`GRADIUM_VOICE_${request.voiceSlot}`],
          process.env.GRADIUM_VOICE_ID,
        ].find((voiceId) => voiceId?.trim()) ?? HOLLY_MATURE_CALM_VOICE_ID,
        output_format: process.env.GRADIUM_OUTPUT_FORMAT ?? "wav",
        only_audio: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error(`Gradium failed with ${response.status}`);
    const audio = Buffer.from(await response.arrayBuffer()).toString("base64");

    return {
      configured: true,
      source: "gradium",
      audioUrl: null,
      audioBase64: audio,
      audioMime: response.headers.get("content-type") ?? "audio/wav",
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
    audioMime: null,
    transcript: text,
  };
}
