import type { CSSProperties } from "react";

/**
 * Shared shell style for widgets rendered inside Monaco view zones
 * (InlineCommentEditor, InlineThreadWidget, InlineDraftWidget).
 *
 * Why sticky + capped width: view zones live inside Monaco's
 * horizontally-scrolling layer, so when a code line is wider than the
 * editor viewport the widget would inherit that scroll width and the
 * right-aligned actions (Salvar, Apagar, Resolver) end up off-screen.
 * Sticky-left + max-width tied to --diff-viewport-w (set by DiffPanel
 * via ResizeObserver, halved on side-by-side mode) keeps the widget
 * glued to the visible editor area regardless of horizontal scroll.
 */
/**
 * Right gutter big enough to clear Monaco's vertical scrollbar (≈14 px
 * default) and leave a little breathing room so the rightmost button
 * (Salvar / Apagar / Responder / Resolver) isn't visually pressed
 * against the scrollbar track.
 */
const RIGHT_GUTTER = "var(--space-10)";
const LEFT_GUTTER = "var(--space-9)";

export const inlineWidgetShell: CSSProperties = {
  position: "sticky",
  left: LEFT_GUTTER,
  width: `calc(var(--diff-viewport-w, 100%) - ${LEFT_GUTTER} - ${RIGHT_GUTTER})`,
  maxWidth: `calc(var(--diff-viewport-w, 100%) - ${LEFT_GUTTER} - ${RIGHT_GUTTER})`,
  margin: "var(--space-2) 0",
  padding: "var(--space-5)",
  borderRadius: "var(--radius-lg)",
  background: "var(--c-mantle)",
  color: "var(--c-text)",
  fontFamily: "var(--font-ui)",
  boxSizing: "border-box",
  zIndex: "var(--z-base)" as unknown as number,
  pointerEvents: "auto",
};
