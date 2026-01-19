import domReady from "@wordpress/dom-ready";
import { createRoot } from "@wordpress/element";
import App from "./App";
import "./style.scss";

domReady(() => {
  const rootElement = document.getElementById("wpnas-kit-app");

  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
  }
});
