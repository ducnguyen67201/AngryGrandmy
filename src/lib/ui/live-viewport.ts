export function getLiveViewportPresentation({
  hasLiveViewport,
  hotspotCount,
}: {
  hasLiveViewport: boolean;
  hotspotCount: number;
}) {
  return {
    showSyntheticScaffold: !hasLiveViewport,
    showHotspotOverlay: hotspotCount > 0,
  };
}
