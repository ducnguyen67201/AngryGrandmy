import { describe, expect, it } from "vitest";
import {
  enqueueLiveVoiceItem,
  getReplayNarrationsForFrame,
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

  it("aligns replay narration with the frame cursor without repeating earlier reactions", () => {
    const events = [
      { id: "before", personaId: "linda", type: "narration", cursor: 2, text: "Where is it?" },
      { id: "at-frame", personaId: "linda", type: "narration", cursor: 5, text: "Oh, there it is." },
      { id: "later", personaId: "linda", type: "narration", cursor: 9, text: "This looks risky." },
      { id: "other-persona", personaId: "rosa", type: "narration", cursor: 4, text: "Not Linda." },
    ];

    expect(getReplayNarrationsForFrame({
      events,
      personaId: "linda",
      previousCursor: 2,
      currentCursor: 5,
      playedEventIds: new Set(),
    }).map(({ id }) => id)).toEqual(["at-frame"]);

    expect(getReplayNarrationsForFrame({
      events,
      personaId: "linda",
      previousCursor: null,
      currentCursor: 5,
      playedEventIds: new Set(["before"]),
    }).map(({ id }) => id)).toEqual(["at-frame"]);

    expect(getReplayNarrationsForFrame({
      events: [events[2], events[1]],
      personaId: "linda",
      previousCursor: 2,
      currentCursor: 9,
      playedEventIds: new Set(),
    }).map(({ id }) => id)).toEqual(["at-frame", "later"]);
  });
});
