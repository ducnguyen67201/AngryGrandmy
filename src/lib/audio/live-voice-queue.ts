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
