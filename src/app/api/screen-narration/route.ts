import { NextRequest } from "next/server";
import { z } from "zod";

import { ok, validationFailure } from "@/lib/api/responses";
import { createScreenNarration } from "@/lib/audio/screen-narration";

const ScreenNarrationRequestSchema = z.object({
  imageUrl: z.string().refine(
    (value) => value.startsWith("data:image/") || /^https:\/\//.test(value),
    "A supported screenshot URL is required.",
  ),
  personaName: z.string().trim().min(1).max(100),
  personaDescription: z.string().trim().min(1).max(1200),
  objective: z.string().trim().min(1).max(500),
  currentUrl: z.string().url().optional(),
});

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const request = ScreenNarrationRequestSchema.parse(await req.json());
    const narration = await createScreenNarration(request);
    return ok(narration, { mode: narration.source });
  } catch (error) {
    return validationFailure(error);
  }
}
