interface Props {
  size?: number;
  /** Hex/css color; defaults to currentColor. */
  color?: string;
}

export function Spinner({ size = 14, color = "currentColor" }: Props) {
  const stroke = Math.max(1.5, size / 9);
  return (
    <span
      aria-label="Carregando"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "var(--radius-pill)",
        border: `${stroke}px solid var(--c-surface1)`,
        borderTopColor: color,
        animation: "prr-spin 700ms linear infinite",
      }}
    />
  );
}

const styleId = "prr-spinner-keyframes";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const el = document.createElement("style");
  el.id = styleId;
  el.textContent = "@keyframes prr-spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(el);
}
