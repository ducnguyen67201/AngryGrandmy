export type LiveVoiceQueueItem = {
  eventId: string;
  audioSrc: string;
  transcript: string;
};

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
  if (events.some(
    (event) =>
      event.personaId === selectedPersonaId &&
      event.type === "narration" &&
      Boolean(event.text?.trim()),
  )) {
    return null;
  }

  return [...events].reverse().find(
    (event) =>
      event.personaId === selectedPersonaId &&
      event.type === "viewport" &&
      Boolean(event.imageUrl) &&
      !processedEventIds.has(event.id),
  ) ?? null;
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
