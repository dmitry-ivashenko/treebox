import { createRoot } from "react-dom/client";
import App from "./app/App";

// Self-hosted fonts (were Google Fonts CDN). Same-origin @font-face lets
// html-to-image read the CSS rules and embed the woff2 into exported PNGs;
// cross-origin CDN sheets throw a SecurityError on cssRules access and the
// export loses fonts / produces a broken image. Only the weights/subsets the
// UI actually uses (Inter 400/500/600/700, JetBrains Mono 400/500; latin +
// latin-ext + cyrillic) are imported to keep the bundle and embed payload lean.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/latin-ext-700.css";
import "@fontsource/inter/cyrillic-400.css";
import "@fontsource/inter/cyrillic-500.css";
import "@fontsource/inter/cyrillic-600.css";
import "@fontsource/inter/cyrillic-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-ext-400.css";
import "@fontsource/jetbrains-mono/latin-ext-500.css";
import "@fontsource/jetbrains-mono/cyrillic-400.css";
import "@fontsource/jetbrains-mono/cyrillic-500.css";

import "./app/styles.css";

createRoot(document.getElementById("root")!).render(<App />);
