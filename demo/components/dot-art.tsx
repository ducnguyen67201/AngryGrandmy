import type { CSSProperties } from 'react';
import type { DotLayer } from '@/lib/dots';

interface DotArtProps {
  layers: DotLayer[];
  viewBox?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a stippled-ink dot field as inline SVG. Purely decorative and
 * aria-hidden — the art never carries meaning on its own. Colour comes from
 * CSS (accent ink), motion is CSS-only and reduced-motion aware.
 *
 * Layers are precomputed deterministically in lib/dots.ts, so the same markup
 * is produced on the server and the client (no hydration mismatch).
 */
export function DotArt({ layers, viewBox = '0 0 100 100', className, style }: DotArtProps) {
  return (
    <svg
      className={className ? `dotart ${className}` : 'dotart'}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {layers.map((layer, li) => (
        <g
          key={li}
          className={layer.spin ? `dotart-spin dotart-spin-${layer.spin}` : undefined}
        >
          {layer.dots.map((d, di) => (
            <circle key={di} cx={d.x} cy={d.y} r={d.r} opacity={d.o} />
          ))}
        </g>
      ))}
    </svg>
  );
}
