import { NextRequest } from "next/server";
import { fail } from "@/lib/api/responses";
import {
  validateHFrameRedirect,
  validateHFrameSource,
} from "@/lib/security/h-frame-source";

export const dynamic = "force-dynamic";

const MAX_FRAME_BYTES = 12_000_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const source = request.nextUrl.searchParams.get("source");
  if (!sessionId || !source) {
    return fail("invalid_frame_request", "Frame request is invalid.", 400);
  }

  let frameUrl: URL;
  try {
    frameUrl = validateHFrameSource(source, sessionId);
  } catch {
    return fail("invalid_frame_request", "Frame request is invalid.", 400);
  }

  const apiKey = process.env.HAI_API_KEY;
  if (!apiKey) {
    return fail("provider_not_configured", "Frame service is unavailable.", 503);
  }

  try {
    let providerResponse = await fetch(frameUrl, {
      headers: {
        Accept: "image/png,image/jpeg,image/webp,image/gif",
        Authorization: `Bearer ${apiKey}`,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if ([301, 302, 303, 307, 308].includes(providerResponse.status)) {
      const location = providerResponse.headers.get("Location");
      if (!location) {
        return fail("frame_unavailable", "Frame is unavailable.", 502);
      }
      const redirectUrl = validateHFrameRedirect(
        new URL(location, frameUrl).href,
      );
      providerResponse = await fetch(redirectUrl, {
        headers: {
          Accept: "image/png,image/jpeg,image/webp,image/gif",
        },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    }
    if (!providerResponse.ok) {
      return fail("frame_unavailable", "Frame is unavailable.", 502);
    }

    const contentType = providerResponse.headers.get("Content-Type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    const announcedLength = Number(
      providerResponse.headers.get("Content-Length") ?? 0,
    );
    if (
      !contentType ||
      !ALLOWED_IMAGE_TYPES.has(contentType) ||
      (announcedLength > 0 && announcedLength > MAX_FRAME_BYTES)
    ) {
      return fail("invalid_frame_response", "Frame is unavailable.", 502);
    }

    const frame = await providerResponse.arrayBuffer();
    if (frame.byteLength > MAX_FRAME_BYTES) {
      return fail("frame_too_large", "Frame is unavailable.", 502);
    }

    return new Response(frame, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=3600, immutable",
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail("frame_unavailable", "Frame is unavailable.", 502);
  }
}
