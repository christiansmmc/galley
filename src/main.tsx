import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
// Points @monaco-editor/loader at the locally bundled Monaco instead of its
// default CDN fetch. Must be imported here and nowhere else — it is the one
// entry point vitest (jsdom) never loads. See src/monaco/setup.ts.
import "./monaco/setup";
import "./i18n";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
