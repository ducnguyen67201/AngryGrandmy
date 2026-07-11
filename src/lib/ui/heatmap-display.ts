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
  panelReady = false,
}: {
  hotspotCount: number;
  heatmapLine: string;
  liveMode: boolean;
  panelReady?: boolean;
}): HeatmapDisplay {
  if (panelReady && hotspotCount === 0 && !liveMode) {
    return {
      label: "Grandma preview",
      countLabel: "Ready to dispatch",
      hint:
        "This is the preflight view of what your generated panel will inspect. If this looks right, dispatch the grandmas to collect real evidence.",
      sourceLabel: "Preview only — live heatmap appears after H evidence.",
    };
  }

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
