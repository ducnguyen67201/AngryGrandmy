const DEFAULT_H_FRAME_HOST = "agp.eu.hcompany.ai";
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function validateHFrameSource(source: string, sessionId: string): URL {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error("Invalid H frame source.");
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error("Invalid H frame source.");
  }

  const configuredHost = configuredHHost();
  const allowedHosts = new Set([DEFAULT_H_FRAME_HOST, configuredHost]);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !allowedHosts.has(url.hostname)
  ) {
    throw new Error("Invalid H frame source.");
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new Error("Invalid H frame source.");
  }
  const prefixes = [
    `/api/v1/trajectories/${sessionId}/resources/`,
    `/api/v2/sessions/${sessionId}/resources/`,
  ];
  const matchesSessionResource = prefixes.some((prefix) =>
    decodedPath.startsWith(prefix),
  );
  if (
    !matchesSessionResource ||
    decodedPath.split("/").some((segment) => segment === "..")
  ) {
    throw new Error("Invalid H frame source.");
  }

  return url;
}

export function buildHFrameProxyUrl(sessionId: string, source: string): string {
  const validated = validateHFrameSource(source, sessionId);
  const params = new URLSearchParams({
    sessionId,
    source: validated.href,
  });
  return `/api/h-frame?${params.toString()}`;
}

export function validateHFrameRedirect(source: string): URL {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error("Invalid H frame redirect.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.endsWith(".s3.amazonaws.com")
  ) {
    throw new Error("Invalid H frame redirect.");
  }
  return url;
}

function configuredHHost(): string {
  try {
    return new URL(
      process.env.HAI_AGENTS_BASE_URL ?? "https://agp.eu.hcompany.ai/api/v2",
    ).hostname;
  } catch {
    return DEFAULT_H_FRAME_HOST;
  }
}
