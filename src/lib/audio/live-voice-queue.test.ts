import { describe, expect, it } from "vitest";
import {
  createLiveVoiceQueueItem,
  enqueueLiveVoiceItem,
  getLiveVoicePlaybackMode,
  getPostRunScreenNarrationFrames,
  getScreenNarrationCandidate,
  getReplayNarrationsForFrame,
  isLiveNarrationEligible,
  shouldSpeakCurrentNarrationOnEnable,
  shouldPrimeReplayNarration,
  shouldEnableLiveVoiceForDispatch,
  type LiveVoiceQueueItem,
} from "./live-voice-queue";

const item = (id: string): LiveVoiceQueueItem => ({
  eventId: id,
  audioSrc: `data:audio/wav;base64,${id}`,
  transcript: `Narration ${id}`,
});

describe("live persona voice queue", () => {
  it("keeps text-only provider responses as browser speech queue items", () => {
    const fallback = createLiveVoiceQueueItem({
      eventId: "finding-1",
      audioSrc: null,
      transcript: "I cannot tell what this button will do.",
    });

    expect(fallback).toEqual({
      eventId: "finding-1",
      audioSrc: null,
      transcript: "I cannot tell what this button will do.",
    });
    expect(getLiveVoicePlaybackMode(fallback!)).toBe("browser-speech");
  });

  it("speaks the visible finding immediately when voice is enabled after completion", () => {
    expect(shouldSpeakCurrentNarrationOnEnable({
      runComplete: true,
      selectedPersonaId: "arjun",
      narration: "I want to understand the requirements before continuing.",
    })).toBe(true);
    expect(shouldSpeakCurrentNarrationOnEnable({
      runComplete: false,
      selectedPersonaId: "arjun",
      narration: "Wait for the next live event.",
    })).toBe(false);
  });

  it("primes replay from the visible screen frame instead of the persona quote", () => {
    expect(shouldPrimeReplayNarration({
      enabled: true,
      frameCount: 46,
      selectedPersonaId: "arjun",
      hasViewportImage: true,
    })).toBe(true);
    expect(shouldPrimeReplayNarration({
      enabled: true,
      frameCount: 0,
      selectedPersonaId: "arjun",
      hasViewportImage: true,
    })).toBe(false);
    expect(shouldPrimeReplayNarration({
      enabled: true,
      frameCount: 46,
      selectedPersonaId: "arjun",
      hasViewportImage: false,
    })).toBe(false);
  });

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

  it("uses the newest selected-persona frame when H provides no narration", () => {
    const events = [
      { id: "frame-1", personaId: "linda", type: "viewport", cursor: 1, imageUrl: "data:image/png;base64,one" },
      { id: "frame-2", personaId: "linda", type: "viewport", cursor: 2, imageUrl: "data:image/png;base64,two" },
      { id: "rosa-frame", personaId: "rosa", type: "viewport", cursor: 3, imageUrl: "data:image/png;base64,three" },
    ];

    expect(getScreenNarrationCandidate({
      enabled: true,
      events,
      selectedPersonaId: "linda",
      processedEventIds: new Set(["frame-1"]),
    })?.id).toBe("frame-2");
  });

  it("still narrates the visible screen when H already supplied a thought", () => {
    expect(getScreenNarrationCandidate({
      enabled: true,
      events: [
        { id: "frame", personaId: "linda", type: "viewport", cursor: 2, imageUrl: "data:image/png;base64,one" },
        { id: "thought", personaId: "linda", type: "narration", cursor: 2, text: "I can see the button.", x: 52, y: 44 },
      ],
      selectedPersonaId: "linda",
      processedEventIds: new Set(),
    })?.id).toBe("frame");
  });

  it("uses vision to locate a same-frame narration that has no coordinates", () => {
    expect(getScreenNarrationCandidate({
      enabled: true,
      events: [
        { id: "frame", personaId: "linda", type: "viewport", cursor: 2, imageUrl: "data:image/png;base64,one" },
        { id: "thought", personaId: "linda", type: "narration", cursor: 2, text: "I can see the button." },
      ],
      selectedPersonaId: "linda",
      processedEventIds: new Set(),
    })?.id).toBe("frame");
  });

  it("allows the active replay frame to be localized when narration belongs to a later frame", () => {
    expect(getScreenNarrationCandidate({
      enabled: true,
      events: [
        { id: "frame", personaId: "linda", type: "viewport", cursor: 2, imageUrl: "data:image/png;base64,one" },
        { id: "later-thought", personaId: "linda", type: "narration", cursor: 8, text: "Later evidence." },
      ],
      selectedPersonaId: "linda",
      processedEventIds: new Set(),
    })?.id).toBe("frame");
  });

  it("does not inspect frames until live voice is enabled for a persona", () => {
    const events = [
      { id: "frame", personaId: "linda", type: "viewport", cursor: 2, imageUrl: "data:image/png;base64,one" },
    ];

    expect(getScreenNarrationCandidate({
      enabled: false,
      events,
      selectedPersonaId: "linda",
      processedEventIds: new Set(),
    })).toBeNull();
    expect(getScreenNarrationCandidate({
      enabled: true,
      events,
      selectedPersonaId: null,
      processedEventIds: new Set(),
    })).toBeNull();
  });

  it("unlocks live voice from the dispatch gesture unless it is already on", () => {
    expect(shouldEnableLiveVoiceForDispatch(false)).toBe(true);
    expect(shouldEnableLiveVoiceForDispatch(true)).toBe(false);
  });

  it("queues selected-persona frames for screen narration only after H finishes", () => {
    const frames = [
      { id: "frame-1", personaId: "arjun", type: "viewport", cursor: 1, imageUrl: "data:image/png;base64,one" },
      { id: "frame-2", personaId: "arjun", type: "viewport", cursor: 2, imageUrl: "data:image/png;base64,two" },
      { id: "casey-frame", personaId: "casey", type: "viewport", cursor: 3, imageUrl: "data:image/png;base64,three" },
      { id: "thought", personaId: "arjun", type: "narration", cursor: 3, text: "Not a viewport frame." },
    ];

    expect(getPostRunScreenNarrationFrames({
      runComplete: false,
      frames,
      selectedPersonaId: "arjun",
      processedFrameIds: new Set(),
    })).toEqual([]);

    expect(getPostRunScreenNarrationFrames({
      runComplete: true,
      frames,
      selectedPersonaId: "arjun",
      processedFrameIds: new Set(["frame-1"]),
    }).map(({ id }) => id)).toEqual(["frame-2"]);
  });
});
