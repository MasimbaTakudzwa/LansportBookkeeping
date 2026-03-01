"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center max-w-md w-full">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="font-semibold text-foreground mb-1">Something went wrong</p>
            <p className="text-xs text-muted-foreground mb-4 break-all">{this.state.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
