import type {
  FrictionEvent,
  NormalizedSession,
  SharedHotspot,
  UsabilityReport,
} from "@/lib/schemas/run";

const DISCLOSURE =
  "Synthetic usability benchmark; not a replacement for human research or accessibility certification." as const;

const NON_TECHNICAL_CATEGORIES = new Set<FrictionEvent["category"]>([
  "navigation",
  "clarity",
  "feedback",
  "recovery",
  "trust",
  "accessibility",
]);

const CLARITY_CATEGORIES = new Set<FrictionEvent["category"]>([
  "clarity",
  "navigation",
  "feedback",
]);

export function calculateUsabilityReport(
  sessions: NormalizedSession[],
  expectedStepBudgetByPersona: Record<string, number>,
): UsabilityReport {
  const scorableSessions = sessions.filter(
    (session) => session.errorCode !== "provider_failure",
  );

  if (scorableSessions.length === 0) {
    return {
      score: 0,
      dimensions: {
        completion: 0,
        efficiency: 0,
        clarity: 0,
        recovery: 0,
        trust: 0,
      },
      completedCount: 0,
      sharedHotspots: [],
      topRecommendations: [],
      disclosure: DISCLOSURE,
    };
  }

  const completion = 40 * mean(scorableSessions.map(completionRatio));
  const efficiency =
    20 *
    mean(
      scorableSessions.map((session) =>
        efficiencyRatio(
          session,
          expectedStepBudgetByPersona[session.personaId] ?? 12,
        ),
      ),
    );
  const clarity = 15 * (1 - mean(scorableSessions.map(clarityPenalty)));
  const recovery = calculateRecovery(scorableSessions);
  const trust = mean(scorableSessions.map(trustScore));
  const dimensions = {
    completion: roundDimension(completion),
    efficiency: roundDimension(efficiency),
    clarity: roundDimension(clarity),
    recovery: roundDimension(recovery),
    trust: roundDimension(trust),
  };

  return {
    score: Math.round(
      dimensions.completion +
        dimensions.efficiency +
        dimensions.clarity +
        dimensions.recovery +
        dimensions.trust,
    ),
    dimensions,
    completedCount: scorableSessions.filter(
      (session) => session.finding?.completion === "success",
    ).length,
    sharedHotspots: clusterSharedHotspots(scorableSessions),
    topRecommendations: topRecommendations(scorableSessions),
    disclosure: DISCLOSURE,
  };
}

function completionRatio(session: NormalizedSession): number {
  switch (session.finding?.completion) {
    case "success":
      return 1;
    case "partial":
      return 0.5;
    default:
      return 0;
  }
}

function efficiencyRatio(
  session: NormalizedSession,
  expectedStepBudget: number,
): number {
  const actualSteps = Math.max(session.stepCount, expectedStepBudget);
  const baseRatio = clamp(expectedStepBudget / actualSteps, 0, 1);

  if (
    session.finding?.completion === "abandoned" ||
    session.finding?.completion === "blocked"
  ) {
    return Math.min(baseRatio, 0.4);
  }

  return baseRatio;
}

function clarityPenalty(session: NormalizedSession): number {
  const severity = frictionEvents(session)
    .filter((event) => CLARITY_CATEGORIES.has(event.category))
    .reduce((sum, event) => sum + event.severity, 0);

  return Math.min(1, severity / 15);
}

function calculateRecovery(sessions: NormalizedSession[]): number {
  const friction = sessions
    .flatMap(frictionEvents)
    .filter((event) => NON_TECHNICAL_CATEGORIES.has(event.category));

  if (friction.length === 0) {
    return 15;
  }

  return (15 * friction.filter((event) => event.recovered).length) / friction.length;
}

function trustScore(session: NormalizedSession): number {
  const penalty = frictionEvents(session)
    .filter((event) => event.category === "trust")
    .reduce((sum, event) => sum + event.severity * 2, 0);

  return Math.max(0, 10 - Math.min(10, penalty));
}

function clusterSharedHotspots(sessions: NormalizedSession[]): SharedHotspot[] {
  const clusters: Array<{
    category: FrictionEvent["category"];
    tokens: Set<string>;
    events: Array<{ event: FrictionEvent; personaId: string }>;
  }> = [];

  for (const session of sessions) {
    for (const event of frictionEvents(session)) {
      if (event.category === "technical") {
        continue;
      }

      const tokens = tokenize(event.visibleEvidence);
      const cluster = clusters.find(
        (candidate) =>
          candidate.category === event.category &&
          jaccard(candidate.tokens, tokens) >= 0.45,
      );

      if (cluster) {
        cluster.events.push({ event, personaId: session.personaId });
        cluster.tokens = new Set([...cluster.tokens, ...tokens]);
      } else {
        clusters.push({
          category: event.category,
          tokens,
          events: [{ event, personaId: session.personaId }],
        });
      }
    }
  }

  return clusters
    .map((cluster, index) => {
      const strongest = cluster.events.reduce((best, current) =>
        current.event.severity > best.event.severity ? current : best,
      );
      const personaIds = Array.from(
        new Set(cluster.events.map((entry) => entry.personaId)),
      );

      return {
        id: `hotspot-${index + 1}`,
        category: cluster.category,
        personaIds,
        maxSeverity: strongest.event.severity,
        visibleEvidence: strongest.event.visibleEvidence,
        recommendation: strongest.event.recommendation,
      };
    })
    .sort((a, b) => {
      const rankA = a.personaIds.length * a.maxSeverity;
      const rankB = b.personaIds.length * b.maxSeverity;
      return rankB - rankA || b.maxSeverity - a.maxSeverity;
    });
}

function topRecommendations(sessions: NormalizedSession[]): string[] {
  const unique = new Map<string, { recommendation: string; severity: number }>();

  for (const event of sessions.flatMap(frictionEvents)) {
    const previous = unique.get(event.recommendation);
    if (!previous || event.severity > previous.severity) {
      unique.set(event.recommendation, {
        recommendation: event.recommendation,
        severity: event.severity,
      });
    }
  }

  return Array.from(unique.values())
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5)
    .map((item) => item.recommendation);
}

function frictionEvents(session: NormalizedSession): FrictionEvent[] {
  return session.finding?.frictionEvents ?? [];
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) {
    return 0;
  }

  const intersection = [...a].filter((token) => b.has(token));
  return intersection.length / union.size;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundDimension(value: number): number {
  return Math.round(value * 10) / 10;
}
