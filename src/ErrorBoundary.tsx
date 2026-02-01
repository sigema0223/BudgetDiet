import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
          <h1>🤖 AI Budget & Diet</h1>
          <div style={{ 
            padding: "20px", 
            background: "#f8d7da", 
            border: "1px solid #dc3545",
            borderRadius: "8px",
            marginTop: "20px"
          }}>
            <h3>⚠️ Something went wrong</h3>
            <p>{this.state.error?.message || "An error occurred"}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: "10px 20px", marginTop: "10px" }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

