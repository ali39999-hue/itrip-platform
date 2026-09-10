"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export interface CanvasErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  className?: string;
  onReset?: () => void;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Resilient Error Boundary for Canvas, Leaflet Map, and WebGL components.
 * Adapted from aroux30/site to gracefully handle mobile GPU crashes or missing WebGL context.
 */
export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CanvasErrorBoundary caught]", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className={`relative flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-border/80 bg-surface/50 backdrop-blur-sm min-h-[220px] ${
            this.props.className || ""
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {this.props.fallbackTitle || "خطا در بارگذاری محتوای گرافیکی"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
            {this.props.fallbackDescription ||
              "امکان رندر نقشه یا بوم تعاملی روی این مرورگر یا دستگاه وجود ندارد. لطفاً دوباره تلاش کنید."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-transform active:scale-[0.98] hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            <span>تلاش مجدد</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
