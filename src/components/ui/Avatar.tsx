import { useState } from "react";

interface Props {
  /** GitHub login — used as fallback initial and to build avatar URL. */
  login: string;
  /** Optional explicit URL; defaults to https://github.com/{login}.png?size=64. */
  src?: string;
  size?: number;
  title?: string;
}

export function Avatar({ login, src, size = 20, title }: Props) {
  const [failed, setFailed] = useState(false);
  const url = src ?? `https://github.com/${encodeURIComponent(login)}.png?size=${size * 2}`;
  const initial = (login.trim()[0] ?? "?").toUpperCase();

  if (failed || !login) {
    return (
      <span
        title={title ?? login}
        style={{
          width: size, height: size,
          borderRadius: "var(--radius-pill)",
          background: "var(--c-surface1)",
          color: "var(--c-text)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.max(9, size * 0.5),
          fontWeight: "var(--weight-semibold)" as unknown as number,
        }}
      >{initial}</span>
    );
  }
  return (
    <img
      src={url}
      alt={title ?? login}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        borderRadius: "var(--radius-pill)",
        background: "var(--c-surface1)",
        display: "inline-block",
      }}
    />
  );
}
