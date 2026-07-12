import { NextRequest } from "next/server";
import { z } from "zod";

import { ok, validationFailure } from "@/lib/api/responses";
import { createScreenNarration } from "@/lib/audio/screen-narration";

const MAX_SCREEN_NARRATION_IMAGE_BYTES = 12_000_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const ScreenNarrationRequestSchema = z.object({
  imageUrl: z.string().refine(isSupportedScreenNarrationImageUrl, "A supported screenshot URL is required."),
  personaName: z.string().trim().min(1).max(100),
  personaDescription: z.string().trim().min(1).max(1200),
  objective: z.string().trim().min(1).max(500),
  currentUrl: z.string().url().optional(),
});

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const request = ScreenNarrationRequestSchema.parse(await req.json());
    const imageUrl = await resolveScreenNarrationImageUrl(
      request.imageUrl,
      req.nextUrl.origin,
    );
    const narration = await createScreenNarration({ ...request, imageUrl });
    return ok(narration, { mode: narration.source });
  } catch (error) {
    return validationFailure(error);
  }
}

function isSupportedScreenNarrationImageUrl(value: string) {
  return (
    value.startsWith("data:image/") ||
    /^https:\/\//.test(value) ||
    value.startsWith("/api/h-frame?")
  );
}

async function resolveScreenNarrationImageUrl(
  imageUrl: string,
  origin: string,
): Promise<string> {
  if (!imageUrl.startsWith("/api/h-frame?")) return imageUrl;

  const response = await fetch(new URL(imageUrl, origin), {
    headers: { Accept: "image/png,image/jpeg,image/webp,image/gif" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error("Frame proxy image is unavailable.");
  }

  const contentType = response.headers.get("Content-Type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  if (
    !contentType ||
    !ALLOWED_IMAGE_TYPES.has(contentType) ||
    (contentLength > 0 && contentLength > MAX_SCREEN_NARRATION_IMAGE_BYTES)
  ) {
    throw new Error("Frame proxy response is not a supported image.");
  }

  const frame = await response.arrayBuffer();
  if (frame.byteLength > MAX_SCREEN_NARRATION_IMAGE_BYTES) {
    throw new Error("Frame proxy image is too large.");
  }

  return `data:${contentType};base64,${Buffer.from(frame).toString("base64")}`;
}
