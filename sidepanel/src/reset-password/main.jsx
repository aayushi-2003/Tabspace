import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import ResetPassword from "./ResetPassword.jsx";
import "./reset-password.css";

createRoot(document.getElementById("reset-root")).render(
  <StrictMode>
    <ErrorBoundary title="Password reset error">
      <ResetPassword />
    </ErrorBoundary>
  </StrictMode>
);
