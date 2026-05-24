import "@testing-library/jest-dom";
import { forceLanguage } from "./src/i18n";

// Pin tests to pt-BR so existing string-based assertions keep working.
// Tests that need to assert in English can call forceLanguage("en") locally.
forceLanguage("pt-BR");
