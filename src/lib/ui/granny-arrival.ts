const GRANNY_ARRIVAL_MIN_MS = 4_200;

export function getGrannyArrivalScenes() {
  return [
    {
      id: "map" as const,
      imageSrc: "/granny-map-journey.png",
      label: "Finding the right household…",
    },
    {
      id: "room" as const,
      imageSrc: "/granny-testing-room.png",
      label: "Linda is getting ready to test…",
    },
  ];
}

export function getRemainingGrannyArrivalDelay({
  startedAt,
  now,
  reducedMotion,
}: {
  startedAt: number;
  now: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion) return 0;
  return Math.max(0, GRANNY_ARRIVAL_MIN_MS - (now - startedAt));
}
