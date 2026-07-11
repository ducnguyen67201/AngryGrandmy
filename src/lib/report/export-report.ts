import type { RunSnapshot } from "@/lib/schemas/run";

export function buildJudgeSummary(snapshot: RunSnapshot): string {
  const analysis = snapshot.analysis;
  const report = snapshot.report;
  const completed = snapshot.sessions.filter(
    (session) => session.finding?.completion === "success",
  ).length;
  const total = snapshot.sessions.length || analysis?.personas.length || 0;

  return [
    `${analysis?.productName ?? "Target product"} scored ${report?.score ?? 0}/100 on GrannySmith.`,
    `${completed}/${total} personas completed their task.`,
    `Top issue: ${report?.topRecommendations[0] ?? "No recommendation available yet."}`,
    `Tested URL: ${snapshot.url}`,
  ].join(" ");
}

export function buildMarkdownReport(snapshot: RunSnapshot): string {
  const analysis = snapshot.analysis;
  const report = snapshot.report;
  const personaById = new Map(
    analysis?.personas.map((persona) => [persona.id, persona]) ?? [],
  );

  return [
    `# GrannySmith Report: ${analysis?.productName ?? "Target Product"}`,
    "",
    `- URL: ${snapshot.url}`,
    `- Objective: ${snapshot.objective ?? "Primary workflow"}`,
    `- Category: ${analysis?.productCategory ?? "Unknown"}`,
    `- Score: ${report?.score ?? 0}/100`,
    `- Completed personas: ${report?.completedCount ?? 0}/${snapshot.sessions.length}`,
    "",
    "## Summary",
    "",
    analysis?.summary ?? "No product summary available.",
    "",
    "## Top Recommendations",
    "",
    ...(report?.topRecommendations.length
      ? report.topRecommendations.map((item) => `- ${item}`)
      : ["- No recommendations available yet."]),
    "",
    "## Shared Hotspots",
    "",
    ...(report?.sharedHotspots.length
      ? report.sharedHotspots.map(
          (hotspot) =>
            `- ${hotspot.category}: ${hotspot.visibleEvidence} Fix: ${hotspot.recommendation}`,
        )
      : ["- No shared hotspots available yet."]),
    "",
    "## Persona Results",
    "",
    ...snapshot.sessions.flatMap((session) => {
      const persona = personaById.get(session.personaId);
      const finding = session.finding;
      return [
        `### ${persona?.displayName ?? session.personaId}`,
        "",
        `- Persona: ${persona?.tagline ?? "Synthetic tester"}`,
        `- Task: ${persona?.task ?? "No task available."}`,
        `- Status: ${session.status}`,
        `- Completion: ${finding?.completion ?? "unknown"}`,
        `- Steps: ${session.stepCount}`,
        `- Evidence link: ${session.agentViewUrl ?? "not available"}`,
        "",
        finding?.summary ?? session.latestActionLabel ?? "No finding available yet.",
        "",
        ...(finding?.frictionEvents.length
          ? finding.frictionEvents.map(
              (event) =>
                `- Friction ${event.step} (${event.category}, severity ${event.severity}/5): ${event.observation} Recommendation: ${event.recommendation}`,
            )
          : ["- No friction events captured."]),
        "",
      ];
    }),
    "## Disclosure",
    "",
    report?.disclosure ??
      "Synthetic usability benchmark; not a replacement for human research or accessibility certification.",
    "",
  ].join("\n");
}

export function buildReportJson(snapshot: RunSnapshot): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: snapshot.analysis,
      url: snapshot.url,
      objective: snapshot.objective,
      sessions: snapshot.sessions,
      report: snapshot.report,
      judgeSummary: buildJudgeSummary(snapshot),
    },
    null,
    2,
  );
}
