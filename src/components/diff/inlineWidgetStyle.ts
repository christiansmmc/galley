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
export const inlineWidgetShell: CSSProperties = {
  position: "sticky",
  left: "var(--space-9)",
  width: "calc(var(--diff-viewport-w, 100%) - var(--space-9) * 2)",
  maxWidth: "calc(var(--diff-viewport-w, 100%) - var(--space-9) * 2)",
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
