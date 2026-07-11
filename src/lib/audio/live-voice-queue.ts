export type LiveVoiceQueueItem = {
  eventId: string;
  audioSrc: string | null;
  transcript: string;
};

export function createLiveVoiceQueueItem(input: LiveVoiceQueueItem) {
  const transcript = input.transcript.trim();
  if (!transcript) return null;
  return {
    eventId: input.eventId,
    audioSrc: input.audioSrc || null,
    transcript,
  } satisfies LiveVoiceQueueItem;
}

export function getLiveVoicePlaybackMode(item: LiveVoiceQueueItem) {
  return item.audioSrc ? "provider-audio" as const : "browser-speech" as const;
}

export function shouldSpeakCurrentNarrationOnEnable({
  runComplete,
  selectedPersonaId,
  narration,
}: {
  runComplete: boolean;
  selectedPersonaId: string | null | undefined;
  narration: string | null | undefined;
}) {
  return Boolean(runComplete && selectedPersonaId && narration?.trim());
}

export function shouldPrimeReplayNarration({
  enabled,
  frameCount,
  selectedPersonaId,
  narration,
}: {
  enabled: boolean;
  frameCount: number;
  selectedPersonaId: string | null | undefined;
  narration: string | null | undefined;
}) {
  return Boolean(
    enabled && frameCount > 0 && selectedPersonaId && narration?.trim(),
  );
}

export function enqueueLiveVoiceItem(
  queue: readonly LiveVoiceQueueItem[],
  item: LiveVoiceQueueItem,
  maxPending = 2,
): LiveVoiceQueueItem[] {
  if (queue.some((queued) => queued.eventId === item.eventId)) {
    return [...queue];
  }

  return [...queue, item].slice(-Math.max(1, maxPending));
}

export function shouldEnableLiveVoiceForDispatch(enabled: boolean): boolean {
  return !enabled;
}

export function isLiveNarrationEligible({
  enabled,
  eventId,
  eventType,
  eventPersonaId,
  selectedPersonaId,
  text,
  spokenEventIds,
}: {
  enabled: boolean;
  eventId: string;
  eventType: string;
  eventPersonaId: string;
  selectedPersonaId: string | null | undefined;
  text: string | null | undefined;
  spokenEventIds: ReadonlySet<string>;
}): boolean {
  return Boolean(
    enabled &&
      eventType === "narration" &&
      eventPersonaId === selectedPersonaId &&
      text?.trim() &&
      !spokenEventIds.has(eventId),
  );
}

export type ReplayNarrationEvent = {
  id: string;
  personaId: string;
  type: string;
  cursor: number;
  text?: string;
};

export type ScreenNarrationEvent = ReplayNarrationEvent & {
  imageUrl?: string;
  sessionId?: string;
  step?: number;
  currentUrl?: string;
  x?: number;
  y?: number;
};

export function getScreenNarrationCandidate({
  enabled,
  events,
  selectedPersonaId,
  processedEventIds,
}: {
  enabled: boolean;
  events: readonly ScreenNarrationEvent[];
  selectedPersonaId: string | null | undefined;
  processedEventIds: ReadonlySet<string>;
}): ScreenNarrationEvent | null {
  if (!enabled || !selectedPersonaId) return null;
  const candidate = [...events].reverse().find(
    (event) =>
      event.personaId === selectedPersonaId &&
      event.type === "viewport" &&
      Boolean(event.imageUrl) &&
      !processedEventIds.has(event.id),
  ) ?? null;
  if (!candidate) return null;

  if (events.some(
    (event) =>
      event.personaId === selectedPersonaId &&
      event.type === "narration" &&
      event.cursor === candidate.cursor &&
      Boolean(event.text?.trim()) &&
      validPercent(event.x) &&
      validPercent(event.y),
  )) {
    return null;
  }
  return candidate;
}

function validPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function getReplayNarrationsForFrame({
  events,
  personaId,
  previousCursor,
  currentCursor,
  playedEventIds,
}: {
  events: readonly ReplayNarrationEvent[];
  personaId: string;
  previousCursor: number | null;
  currentCursor: number;
  playedEventIds: ReadonlySet<string>;
}): ReplayNarrationEvent[] {
  return events
    .filter(
      (event) =>
        event.type === "narration" &&
        event.personaId === personaId &&
        Boolean(event.text?.trim()) &&
        event.cursor <= currentCursor &&
        (previousCursor === null || event.cursor > previousCursor) &&
        !playedEventIds.has(event.id),
    )
    .sort((left, right) => left.cursor - right.cursor);
}
