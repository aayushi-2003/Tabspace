import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import Popup from "./Popup.jsx";
import "./popup.css";

createRoot(document.getElementById("popup-root")).render(
  <StrictMode>
    <ErrorBoundary title="Popup error">
      <Popup />
    </ErrorBoundary>
  </StrictMode>
);
