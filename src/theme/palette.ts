/* Paper / Linen palette — Etapa 3 "Calm Workshop".
   Replaces Catppuccin Latte/Mocha. Values mirror globals.css CSS vars;
   keep them in sync. */

export const paper = {
  base: "#F4F1EA", mantle: "#EDE9DF", crust: "#E5DFD0",
  surface0: "#FAF7F0", surface1: "#FFFFFF", surface2: "#EDE9DF",
  line: "#D9D2C2", lineSoft: "#E5DFD0",
  text: "#2A2723", subtext: "#6B6358", overlay: "#A09787",
  accent: "#5E7556", accentSoft: "rgba(94, 117, 86, 0.12)",
  success: "#4F7A3E", warn: "#B8853A", danger: "#A64A3A", info: "#3B5C7E",
} as const;

export const linen = {
  base: "#16161A", mantle: "#1B1B1F", crust: "#0F0F12",
  surface0: "#222226", surface1: "#2A2A2F", surface2: "#313137",
  line: "#2E2E33", lineSoft: "#26262B",
  text: "#DCD8CF", subtext: "#8E887D", overlay: "#5B564E",
  accent: "#8FA888", accentSoft: "rgba(143, 168, 136, 0.12)",
  success: "#7CA664", warn: "#C9A35A", danger: "#C77863", info: "#7AA5C9",
} as const;

export type Palette = { [K in keyof typeof paper]: string };
