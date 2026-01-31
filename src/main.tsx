import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import App from "./App.tsx";

// Initialize Convex client
const convexUrl = (import.meta.env.VITE_CONVEX_URL as string) || "";

// Only create client if URL is provided, otherwise use a placeholder
let convex: ConvexReactClient;
if (convexUrl) {
  convex = new ConvexReactClient(convexUrl);
} else {
  // Create a dummy client that won't crash but will show errors
  convex = new ConvexReactClient("https://hearty-marten-126.convex.cloud");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

