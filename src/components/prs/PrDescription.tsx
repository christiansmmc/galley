import { useMemo, type MouseEvent } from "react";
import DOMPurify from "dompurify";
import { api } from "../../ipc/client";

interface Props { html: string | null; fallback: string | null; }

export function PrDescription({ html, fallback }: Props) {
  // GitHub already sanitizes body_html, but this runs in a webview with no CSP
  // and access to every Tauri command, so it gets a second pass here.
  const clean = useMemo(() => (html === null ? null : DOMPurify.sanitize(html)), [html]);

  // Left alone, a click would navigate the webview away from the app.
  const onClick = (e: MouseEvent) => {
    const link = (e.target as Element).closest("a");
    if (!link) return;
    e.preventDefault();
    const href = link.getAttribute("href") ?? "";
    if (/^https?:\/\//i.test(href)) void api.openExternalUrl(href);
  };

  if (clean === null) {
    return <div className="pr-description cfg-scroll" style={{ whiteSpace: "pre-wrap" }}>{fallback}</div>;
  }
  return (
    <div
      className="pr-description cfg-scroll"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
