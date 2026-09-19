// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert Component (shadcn UI)', () => {
  it('renders default alert with title and description', () => {
    render(
      <Alert>
        <AlertTitle>اطلاعیه</AlertTitle>
        <AlertDescription>متن پیام آزمایشی</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(screen.getByText('اطلاعیه')).toBeDefined();
    expect(screen.getByText('متن پیام آزمایشی')).toBeDefined();
  });

  it('renders with warning variant styles', () => {
    render(
      <Alert variant="warning" data-testid="warning-alert">
        <AlertTitle>هشدار</AlertTitle>
        <AlertDescription>هنوز خریدت رو تکمیل نکردی</AlertDescription>
      </Alert>
    );

    const alert = screen.getByTestId('warning-alert');
    expect(alert.className).toContain('border-amber-500');
    expect(screen.getByText('هنوز خریدت رو تکمیل نکردی')).toBeDefined();
  });
});
