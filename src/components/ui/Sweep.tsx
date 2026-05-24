interface Props {
  /** Top offset (px) relative to parent. Defaults to 0. */
  top?: number;
}

/**
 * 1px accent bar that sweeps across the parent. Parent MUST be position:
 * relative — Sweep absolute-positions itself.
 */
export function Sweep({ top = 0 }: Props) {
  return (
    <div
      role="status"
      aria-label="carregando"
      aria-live="polite"
      style={{
        position: "absolute",
        left: 0,
        top,
        right: 0,
        height: 1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          height: 1,
          width: "30%",
          background: "var(--c-accent)",
          animation: "prr-sweep 1400ms ease-in-out infinite",
        }}
      />
    </div>
  );
}

interface SkeletonProps {
  /** Number of bars to render. */
  rows?: number;
}

/**
 * Stack of muted bars used while content is loading. Designed to occupy
 * the same vertical area the real list/diff will fill.
 */
export function SkeletonBars({ rows = 6 }: SkeletonProps) {
  return (
    <div style={{ padding: "var(--space-6) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 10,
            width: `${50 + ((i * 37) % 40)}%`,
            background: "var(--c-mantle)",
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
