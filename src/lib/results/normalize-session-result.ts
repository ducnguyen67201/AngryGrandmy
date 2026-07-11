import type {
  AgentFinding,
  FrictionEvent,
  NormalizedSession,
} from "@/lib/schemas/run";

const FRICTION_HINTS =
  /\b(confus|unclear|difficult|hard|blocked|failed|could not|couldn't|issue|problem|friction|hesitat|backtrack|missing|unlabeled|tiny|trust|error)\b/i;

type SessionResultInput = {
  sessionId: string;
  personaId: string;
  status: NormalizedSession["status"];
  baseSession?: NormalizedSession;
  finalAnswer: string | null;
  eventText: string[];
};

export function normalizeSessionResult(
  input: SessionResultInput,
): NormalizedSession {
  const text = [input.finalAnswer, ...input.eventText].filter(Boolean).join("\n");
  const finding = buildFinding(text, input.status);
  const failed =
    input.status === "failed" ||
    input.status === "timed_out" ||
    input.status === "interrupted";

  return {
    sessionId: input.sessionId,
    personaId: input.personaId,
    status: input.status,
    visualState: failed
      ? "failed"
      : finding.completion === "success"
        ? "succeeded"
        : finding.completion === "blocked"
          ? "blocked"
          : "confused",
    eventCursor: input.baseSession?.eventCursor ?? input.eventText.length,
    stepCount: Math.max(input.baseSession?.stepCount ?? 0, input.eventText.length),
    startedAt: input.baseSession?.startedAt ?? null,
    finishedAt: input.baseSession?.finishedAt ?? new Date().toISOString(),
    agentViewUrl: input.baseSession?.agentViewUrl ?? null,
    outcome: finding.completion === "success" ? "success" : "failure",
    latestActionLabel: summaryLabel(finding),
    finding,
    errorCode: failed ? "provider_failure" : null,
  };
}

function buildFinding(text: string, status: NormalizedSession["status"]): AgentFinding {
  const normalized = text.trim() || "The H session finished without a readable final answer.";
  const completion = inferCompletion(normalized, status);
  const frictionEvents = extractFrictionEvents(normalized);

  return {
    completion,
    summary: firstSentence(normalized),
    evidence: extractEvidence(normalized),
    frictionEvents,
    safeStopReached:
      completion === "success" ||
      /\b(stop|stopped|review|before submitting|did not submit|safe)\b/i.test(
        normalized,
      ),
  };
}

function inferCompletion(
  text: string,
  status: NormalizedSession["status"],
): AgentFinding["completion"] {
  if (status === "failed" || status === "timed_out" || status === "interrupted") {
    return "blocked";
  }

  if (/\b(success|completed|reached|finished|found|identified)\b/i.test(text)) {
    return "success";
  }

  if (/\b(partial|some progress|started|began|reached but|found but)\b/i.test(text)) {
    return "partial";
  }

  if (/\b(blocked|could not|couldn't|failed|gave up|unable)\b/i.test(text)) {
    return "blocked";
  }

  return "partial";
}

function extractFrictionEvents(text: string): FrictionEvent[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const frictionSentences = sentences.filter((sentence) =>
    FRICTION_HINTS.test(sentence),
  );

  const source = frictionSentences.length
    ? frictionSentences
    : sentences.filter((sentence) => /recommend|should|improve/i.test(sentence));

  return source.slice(0, 5).map((sentence, index) => {
    const category = inferCategory(sentence);
    return {
      step: index + 1,
      category,
      severity: inferSeverity(sentence),
      observation: sentence,
      visibleEvidence: sentence,
      recommendation: inferRecommendation(sentence, category),
      narratedObservation: toNarration(sentence),
      recovered: /\b(recovered|eventually|after|then found|managed)\b/i.test(
        sentence,
      ),
    };
  });
}

function extractEvidence(text: string): string[] {
  const lines = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 12);

  return (lines.length ? lines : [text]).slice(0, 5);
}

function inferCategory(sentence: string): FrictionEvent["category"] {
  if (/\btrust|payment|insurance|privacy|account|commit|submit\b/i.test(sentence)) {
    return "trust";
  }
  if (/\bicon|tiny|small|zoom|contrast|read|accessib/i.test(sentence)) {
    return "accessibility";
  }
  if (/\bback|recover|undo|return|loop\b/i.test(sentence)) {
    return "recovery";
  }
  if (/\bfeedback|confirm|selected|changed|state\b/i.test(sentence)) {
    return "feedback";
  }
  if (/\bunclear|label|word|copy|explain|meaning\b/i.test(sentence)) {
    return "clarity";
  }
  if (/\berror|timeout|crash|load|technical\b/i.test(sentence)) {
    return "technical";
  }
  return "navigation";
}

function inferSeverity(sentence: string): FrictionEvent["severity"] {
  if (/\b(blocked|failed|unable|could not|couldn't|gave up)\b/i.test(sentence)) {
    return 5;
  }
  if (/\b(trust|payment|private|insurance|account|submit)\b/i.test(sentence)) {
    return 4;
  }
  if (/\b(confusing|unclear|difficult|hard|missing)\b/i.test(sentence)) {
    return 3;
  }
  if (/\b(hesitated|slow|looked|searched)\b/i.test(sentence)) {
    return 2;
  }
  return 1;
}

function inferRecommendation(
  sentence: string,
  category: FrictionEvent["category"],
): string {
  const explicit = sentence.match(/(?:recommend|should|improve|fix)(?:s|ed)?[:\s]+(.+)/i);
  if (explicit?.[1]) return tidy(explicit[1]);

  const recommendations: Record<FrictionEvent["category"], string> = {
    navigation: "Make the next step visible with a plain-language action label.",
    clarity: "Rewrite the confusing copy using everyday language and examples.",
    feedback: "Show explicit confirmation after each important selection.",
    recovery: "Add a clear back or change option near the point of confusion.",
    trust: "Explain why sensitive information is needed before asking for it.",
    accessibility: "Increase label visibility and avoid icon-only actions.",
    technical: "Stabilize the flow and provide a visible recovery message.",
  };

  return recommendations[category];
}

function summaryLabel(finding: AgentFinding): string {
  if (finding.completion === "success") return "Completed with evidence captured";
  if (finding.completion === "partial") return "Partial completion scored";
  if (finding.completion === "blocked") return "Blocked with friction captured";
  return "Abandoned with friction captured";
}

function firstSentence(text: string): string {
  return tidy(text.split(/(?<=[.!?])\s+/)[0] ?? text).slice(0, 260);
}

function toNarration(sentence: string): string {
  const cleaned = tidy(sentence);
  if (cleaned.length <= 180) return cleaned;
  return `${cleaned.slice(0, 177).trim()}...`;
}

function tidy(value: string): string {
  return value.replace(/\s+/g, " ").replace(/^[-:*.\s]+/, "").trim();
}
