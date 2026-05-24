import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

export type LanguageChoice = "auto" | "en" | "pt-BR";

const STORAGE_KEY = "prr.language";

/**
 * Resolve which i18next language to use given the user's stored preference.
 *
 * Resolution order:
 *   1. Explicit user choice ("en" or "pt-BR") — wins always.
 *   2. "auto" → navigator.language: starts with "pt" → "pt-BR", else "en".
 *   3. Fallback: English (NOT pt-BR — English is the default).
 *
 * The browser-language detector inside Tauri's webkit2gtk reads
 * navigator.language reliably; this helper just simplifies the mapping.
 */
export function resolveLanguage(choice: LanguageChoice): "en" | "pt-BR" {
  if (choice === "en" || choice === "pt-BR") return choice;
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  if (nav && nav.toLowerCase().startsWith("pt")) return "pt-BR";
  return "en";
}

const STORED = (() => {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (v === "en" || v === "pt-BR" || v === "auto") return v as LanguageChoice;
  } catch {
    /* localStorage may throw in some sandboxes; fall through */
  }
  return "auto" as LanguageChoice;
})();

// Tests pin to pt-BR so existing assertions (Portuguese strings) keep working.
// Detected via vitest's MODE env — see vitest.setup.ts forceLanguage call too.
const IS_TEST = (() => {
  try {
    return (
      (typeof import.meta !== "undefined" && import.meta.env?.MODE === "test") ||
      (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
      (typeof process !== "undefined" && !!process.env?.VITEST)
    );
  } catch {
    return false;
  }
})();

const INITIAL_LANG: "en" | "pt-BR" = IS_TEST ? "pt-BR" : resolveLanguage(STORED);

// Initialise synchronously: with all resources inlined and no backend,
// i18next resolves in the same tick.
void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "pt-BR": { translation: ptBR },
    },
    lng: INITIAL_LANG,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

/** Persist the user's *raw* choice (including "auto") so we can re-resolve later. */
export function setLanguageChoice(choice: LanguageChoice): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
  // Tests pin the language to pt-BR; settings saves must not flip them back
  // to "auto" → navigator.language (which jsdom reports as "en").
  if (IS_TEST) return;
  void i18n.changeLanguage(resolveLanguage(choice));
}

/** Force a specific resolved language. Used by tests to pin to pt-BR. */
export function forceLanguage(lang: "en" | "pt-BR"): void {
  // `changeLanguage` returns a Promise but, with inlined resources and no
  // backend, the language switch is applied synchronously before the
  // promise resolves. Tests rely on this — see vitest.setup.ts.
  void i18n.changeLanguage(lang);
  i18n.language = lang;
}

/** Short alias re-exported from react-i18next to keep call sites lean. */
export function useT() {
  const { t } = useTranslation();
  return t;
}

export default i18n;
