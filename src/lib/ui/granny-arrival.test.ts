import { describe, expect, it } from "vitest";

import {
  getGrannyArrivalScenes,
  getRemainingGrannyArrivalDelay,
} from "./granny-arrival";

describe("granny arrival transition", () => {
  it("moves from the neighborhood map into Linda's testing room", () => {
    expect(getGrannyArrivalScenes()).toEqual([
      {
        id: "map",
        imageSrc: "/granny-map-journey.png",
        label: "Finding the right household…",
      },
      {
        id: "room",
        imageSrc: "/granny-testing-room.png",
        label: "Linda is getting ready to test…",
      },
    ]);
  });

  it("keeps the cinematic visible long enough to complete", () => {
    expect(getRemainingGrannyArrivalDelay({
      startedAt: 1_000,
      now: 2_200,
      reducedMotion: false,
    })).toBe(3_000);
  });

  it("does not delay results when reduced motion is requested", () => {
    expect(getRemainingGrannyArrivalDelay({
      startedAt: 1_000,
      now: 1_000,
      reducedMotion: true,
    })).toBe(0);
  });
});
