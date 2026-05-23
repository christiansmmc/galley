import type { editor } from "monaco-editor";
import { latte, mocha, type Palette } from "./catppuccin";

function build(p: Palette, base: "vs" | "vs-dark"): editor.IStandaloneThemeData {
  return {
    base,
    inherit: true,
    rules: [
      { token: "", foreground: p.text.slice(1), background: p.base.slice(1) },
      { token: "comment", foreground: p.overlay1.slice(1), fontStyle: "italic" },
      { token: "string", foreground: p.green.slice(1) },
      { token: "number", foreground: p.peach.slice(1) },
      { token: "keyword", foreground: p.mauve.slice(1) },
      { token: "type", foreground: p.yellow.slice(1) },
      { token: "function", foreground: p.blue.slice(1) },
    ],
    colors: {
      "editor.background": p.base,
      "editor.foreground": p.text,
      "editorLineNumber.foreground": p.overlay0,
      "editorLineNumber.activeForeground": p.text,
      "editorCursor.foreground": p.rosewater,
      "editor.selectionBackground": p.surface2,
      "editor.lineHighlightBackground": p.mantle,
      "diffEditor.insertedTextBackground": "#a6e3a133",
      "diffEditor.removedTextBackground": "#f38ba833",
    },
  };
}

export const monacoLatte = build(latte, "vs");
export const monacoMocha = build(mocha, "vs-dark");
