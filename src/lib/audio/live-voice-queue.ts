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
