import { describe, expect, it } from "vitest";

import { getReplayPersonaPresence } from "./replay-persona-presence";

describe("replay persona presence", () => {
  it("gives older-adult Linda a human avatar and first-person replay labels", () => {
    expect(getReplayPersonaPresence({
      id: "linda",
      displayName: "Linda",
      context: "Linda is an older adult trying this product for the first time.",
    })).toEqual({
      avatarSrc: "/grandma-linda-2d.png",
      cursorLabel: "Linda is looking here",
      narrationLabel: "Linda is thinking aloud",
    });
  });

  it("humanizes other personas without misrepresenting them as Linda", () => {
    expect(getReplayPersonaPresence({
      id: "taylor",
      displayName: "Taylor",
      context: "Taylor is a technical evaluator.",
    })).toEqual({
      avatarSrc: null,
      cursorLabel: "Taylor is looking here",
      narrationLabel: "Taylor is thinking aloud",
    });
  });
});
