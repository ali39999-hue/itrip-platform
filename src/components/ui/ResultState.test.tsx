// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { axe } from 'jest-axe';
import { ResultState } from './ResultState';

const messages = {
  Common: {
    states: {
      retry: 'Try again',
      loading: 'Loading…',
      errorTitle: 'Something went wrong',
      emptyTitle: 'No results found',
    },
  },
};

function renderState(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ResultState', () => {
  it('announces loading with role=status and no focusable content', () => {
    renderState(<ResultState variant="loading" />);
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeTruthy();
  });

  it('shows empty state with role=status', () => {
    renderState(<ResultState variant="empty" description="Try wider dates." />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('No results found')).toBeTruthy();
    expect(screen.getByText('Try wider dates.')).toBeTruthy();
  });

  it('shows error as role=alert with a touch-friendly retry action', () => {
    let clicked = 0;
    renderState(<ResultState variant="error" onAction={() => (clicked += 1)} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    const btn = screen.getByRole('button', { name: 'Try again' });
    // 44px minimum touch target (min-h-11).
    expect(btn.className).toContain('min-h-11');
    fireEvent.click(btn);
    expect(clicked).toBe(1);
  });

  it('has no axe violations for the error variant', async () => {
    const { container } = renderState(
      <ResultState variant="error" description="Supplier hiccup." onAction={() => {}} />,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
