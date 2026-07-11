import type { VisualHotspot } from "@/lib/hotspots/build-hotspots";

export type HeatmapDensityBlob = {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  coreOpacity: number;
};

const MAX_DENSITY_SIGNALS = 18;

export function buildHeatmapDensityBlobs(
  hotspots: VisualHotspot[],
): HeatmapDensityBlob[] {
  return hotspots.slice(-MAX_DENSITY_SIGNALS).map((hotspot) => {
    const severity = clamp(hotspot.severity, 1, 5);

    return {
      id: hotspot.id,
      x: clamp(hotspot.x, 0, 100),
      y: clamp(hotspot.y, 0, 100),
      radius: 10 + severity * 2.2,
      opacity: 0.48 + severity * 0.065,
      coreOpacity: 0.5 + severity * 0.09,
    };
  });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
