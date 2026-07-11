export type HeatmapDisplay = {
  label: string;
  countLabel: string;
  hint: string;
  sourceLabel: string;
};

export function getHeatmapDisplay({
  hotspotCount,
  heatmapLine,
  liveMode,
}: {
  hotspotCount: number;
  heatmapLine: string;
  liveMode: boolean;
}): HeatmapDisplay {
  if (hotspotCount === 0) {
    return {
      label: "Live heatmap",
      countLabel: liveMode ? "Waiting for evidence" : "No hotspots yet",
      hint: liveMode
        ? "Heatmap appears here after H sessions finish and findings are scored."
        : "Run or load a test with friction findings to draw heatmap markers.",
      sourceLabel: heatmapLine,
    };
  }

  return {
    label: "Live heatmap",
    countLabel: `${hotspotCount} hotspot${hotspotCount === 1 ? "" : "s"}`,
    hint: "Click the glowing numbered markers on the mini product screens to inspect evidence.",
    sourceLabel: heatmapLine,
  };
}
