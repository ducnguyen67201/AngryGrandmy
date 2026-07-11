import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, validationFailure } from "@/lib/api/responses";
import { createVoiceReaction } from "@/lib/integrations/gradium";

const VoiceRequestSchema = z.object({
  personaId: z.string().min(1),
  voiceSlot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(1).max(500),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const request = VoiceRequestSchema.parse(await req.json());
    const reaction = await createVoiceReaction(request);
    return ok(reaction, { mode: reaction.source });
  } catch (error) {
    return validationFailure(error);
  }
}
