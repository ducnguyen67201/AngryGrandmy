import { describe, expect, it } from "vitest";
import {
  enqueueLiveVoiceItem,
  isLiveNarrationEligible,
  type LiveVoiceQueueItem,
} from "./live-voice-queue";

const item = (id: string): LiveVoiceQueueItem => ({
  eventId: id,
  audioSrc: `data:audio/wav;base64,${id}`,
  transcript: `Narration ${id}`,
});

describe("live persona voice queue", () => {
  it("keeps only the newest pending reactions when narration falls behind", () => {
    const queue = [item("one"), item("two")];

    expect(enqueueLiveVoiceItem(queue, item("three"), 2).map(({ eventId }) => eventId))
      .toEqual(["two", "three"]);
  });

  it("does not enqueue the same narration twice", () => {
    const queue = [item("one")];

    expect(enqueueLiveVoiceItem(queue, item("one"), 2)).toEqual(queue);
  });

  it("speaks only new narration for the selected persona after live voice is enabled", () => {
    expect(isLiveNarrationEligible({
      enabled: true,
      eventId: "event-1",
      eventType: "narration",
      eventPersonaId: "linda",
      selectedPersonaId: "linda",
      text: "Where is that button?",
      spokenEventIds: new Set(),
    })).toBe(true);

    expect(isLiveNarrationEligible({
      enabled: true,
      eventId: "event-1",
      eventType: "narration",
      eventPersonaId: "rosa",
      selectedPersonaId: "linda",
      text: "I found it.",
      spokenEventIds: new Set(),
    })).toBe(false);
  });
});
