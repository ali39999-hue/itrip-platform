// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CanvasErrorBoundary } from "./canvas-error-boundary";

function ThrowingComponent(): React.ReactNode {
  throw new Error("Simulated WebGL Context Lost");
}

function HealthyComponent() {
  return <div>Healthy Map Content</div>;
}

describe("CanvasErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <CanvasErrorBoundary>
        <HealthyComponent />
      </CanvasErrorBoundary>
    );

    expect(screen.getByText("Healthy Map Content")).toBeDefined();
  });

  it("catches error and renders accessible fallback UI with retry button", () => {
    // Suppress React console.error during expected throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onResetMock = vi.fn();

    render(
      <CanvasErrorBoundary
        fallbackTitle="خطای نقشه"
        fallbackDescription="توضیحات خطا"
        onReset={onResetMock}
      >
        <ThrowingComponent />
      </CanvasErrorBoundary>
    );

    expect(screen.getByText("خطای نقشه")).toBeDefined();
    expect(screen.getByText("توضیحات خطا")).toBeDefined();

    const retryBtn = screen.getByRole("button", { name: /تلاش مجدد/ });
    expect(retryBtn).toBeDefined();

    fireEvent.click(retryBtn);
    expect(onResetMock).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
